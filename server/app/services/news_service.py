
import asyncio
import hashlib
import httpx
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.models.news_cache import NewsCache
from app.schemas.news import NewsItem, NewsResponse, PersonalizedNewsTopic, PersonalizedNewsResponse

class NewsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_news(self, topic: str, limit: int = 10) -> NewsResponse:
        """Fetch news for a topic, using cache if available."""
        normalized_topic = topic.strip().lower()
        
        # 1. Check Cache
        stmt = select(NewsCache).where(NewsCache.topic == normalized_topic)
        result = await self.db.execute(stmt)
        cache_entry = result.scalar_one_or_none()

        if cache_entry and not cache_entry.is_expired:
            return NewsResponse(
                topic=topic,
                items=cache_entry.json_payload.get("items", []),
                cached=True,
                lastFetchedAt=cache_entry.fetched_at
            )

        # 2. Fetch Fresh from NewsData.io
        try:
            articles = await self._fetch_from_provider(topic)
            normalized_items = self._normalize_articles(articles, limit)
            
            # 3. Update Cache
            if cache_entry:
                cache_entry.json_payload = {"items": [item.model_dump() for item in normalized_items]}
                cache_entry.fetched_at = datetime.now(timezone.utc)
                cache_entry.ttl_seconds = settings.NEWS_CACHE_TTL_SECONDS
            else:
                new_cache = NewsCache(
                    topic=normalized_topic,
                    json_payload={"items": [item.model_dump() for item in normalized_items]},
                    fetched_at=datetime.now(timezone.utc),
                    ttl_seconds=settings.NEWS_CACHE_TTL_SECONDS
                )
                self.db.add(new_cache)
            
            await self.db.commit()

            return NewsResponse(
                topic=topic,
                items=normalized_items,
                cached=False,
                lastFetchedAt=datetime.now(timezone.utc)
            )

        except Exception as e:
            # 4. Fallback to synthetic data if provider fails and no cache
            print(f"News fetch failed for '{topic}', using synthetic fallback: {e}")
            synthetic_items = self._get_synthetic_news(topic, limit)
            
            return NewsResponse(
                topic=topic,
                items=synthetic_items,
                cached=False,
                lastFetchedAt=datetime.now(timezone.utc)
            )

    async def get_personalized_news(self, faculty_id: str, topics: List[str]) -> PersonalizedNewsResponse:
        """Fetch news for multiple topics concurrently."""
        tasks = [self.fetch_news(topic, limit=8) for topic in topics]
        results = await asyncio.gather(*tasks)
        
        personalized_topics = [
            PersonalizedNewsTopic(
                topic=res.topic,
                items=res.items,
                cached=res.cached,
                lastFetchedAt=res.lastFetchedAt
            ) for res in results
        ]
        
        return PersonalizedNewsResponse(topics=personalized_topics)

    async def _fetch_from_provider(self, topic: str) -> List[Dict[str, Any]]:
        """Call NewsData.io API."""
        if not settings.NEWSDATA_API_KEY or settings.NEWSDATA_API_KEY == "your_key_here":
            raise ValueError("NewsData API key not configured")

        params = {
            "apikey": settings.NEWSDATA_API_KEY,
            "q": topic,
            "language": "en"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.NEWSDATA_BASE_URL, params=params)
            
            if response.status_code != 200:
                raise Exception(f"NewsData.io error: {response.status_code}")
            
            data = response.json()
            if data.get("status") == "error":
                raise Exception(f"NewsData.io API error: {data.get('message')}")
                
            return data.get("results", [])

    def _normalize_articles(self, articles: List[Dict[str, Any]], limit: int) -> List[NewsItem]:
        """Convert NewsData.io format to our NewsItem schema."""
        normalized = []
        for art in articles[:limit]:
            # Generate a stable ID if article_id is missing
            article_id = art.get("article_id")
            if not article_id:
                raw_id = f"{art.get('title', '')}{art.get('pubDate', '')}"
                article_id = hashlib.md5(raw_id.encode()).hexdigest()

            # Normalize summary
            summary = art.get("description") or art.get("content") or ""
            if len(summary) > 200:
                summary = summary[:197] + "..."

            item = NewsItem(
                id=article_id,
                title=art.get("title") or "No Title",
                summary=summary,
                source=art.get("source_id") or art.get("source_name") or "Unknown",
                publishedAt=art.get("pubDate"),
                url=art.get("link") or "",
                imageUrl=art.get("image_url")
            )
            normalized.append(item)
        return normalized

    def _get_synthetic_news(self, topic: str, limit: int) -> List[NewsItem]:
        """Generate high-quality mock news for development and fallback."""
        topic_lower = topic.lower()
        now = datetime.now(timezone.utc)
        
        # Base templates for different professional topics
        templates = {
            "ai": [
                {"title": "The Rise of Agentic AI in Enterprise Workflows", "summary": "New research shows a 45% increase in productivity when deploying autonomous agents for documentation and code analysis.", "imageUrl": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80"},
                {"title": "Open-Source LLMs Now Rival Proprietary Models in Coding Tasks", "summary": "Recent benchmarks indicate that the latest open-source models are closing the gap with major proprietary players in logic and reasoning.", "imageUrl": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80"},
                {"title": "Ethics and Governance: Navigating the New AI Regulations", "summary": "A comprehensive guide for faculty and research leads on complying with the latest international AI safety standards.", "imageUrl": "https://images.unsplash.com/photo-1655635643532-fa9ba2648cbe?w=600&q=80"}
            ],
            "cloud": [
                {"title": "Serverless Architecture: Beyond the Hype in 2024", "summary": "Exploring the cost-benefits and performance trade-offs of fully managed serverless stacks for academic research portals.", "imageUrl": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80"},
                {"title": "Multi-Cloud Strategy for Resilient High-Performance Computing", "summary": "Why leading universities are moving away from single-vendor lock-in for their large-scale data processing needs.", "imageUrl": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80"},
                {"title": "Edge Computing Trends: Bringing Processing Closer to Data", "summary": "How IoT and real-time analytics are driving the adoption of decentralized cloud infrastructure.", "imageUrl": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80"}
            ],
            "data science": [
                {"title": "Standardizing Data Pipelines with Modern Orchestration Tools", "summary": "A look at how tools like Prefect and Dagster are replacing legacy Cron jobs in data science research labs.", "imageUrl": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80"},
                {"title": "The Evolution of Vector Databases for RAG Applications", "summary": "Understanding the importance of efficient similarity search in the era of large language model retrieval.", "imageUrl": "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=600&q=80"},
                {"title": "Privacy-Preserving Machine Learning: Federated Learning at Scale", "summary": "How institutions are training models on sensitive student data without compromising individual privacy.", "imageUrl": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80"}
            ],
            "machine learning": [
                {"title": "Transformer Architectures Redefining Computer Vision Tasks", "summary": "Vision Transformers are outperforming traditional CNNs in image classification benchmarks across medical imaging datasets.", "imageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80"},
                {"title": "AutoML Platforms Lower the Barrier for Non-Expert Researchers", "summary": "Tools like Google AutoML and H2O.ai are enabling subject-matter experts to build ML models without deep ML expertise.", "imageUrl": "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80"},
                {"title": "Reinforcement Learning Breakthroughs in Robotics and Control Systems", "summary": "Recent advances in RL allow robots to learn complex manipulation tasks in simulation and transfer to real-world environments.", "imageUrl": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80"}
            ],
            "cybersecurity": [
                {"title": "Zero-Trust Architecture Becomes the New Security Standard", "summary": "Organizations worldwide are abandoning perimeter-based security models in favor of continuous verification frameworks.", "imageUrl": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80"},
                {"title": "AI-Powered Threat Detection Reduces Incident Response Time by 60%", "summary": "Machine learning models are identifying sophisticated attack patterns that traditional signature-based tools miss entirely.", "imageUrl": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&q=80"},
                {"title": "Quantum-Resistant Cryptography: Preparing for Post-Quantum Threats", "summary": "NIST finalizes its first set of post-quantum cryptographic standards, urging institutions to begin migration planning.", "imageUrl": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80"}
            ],
            "web development": [
                {"title": "React Server Components Transform Full-Stack Development", "summary": "The boundary between frontend and backend blurs further as RSC enables seamless server-side rendering with client interactivity.", "imageUrl": "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600&q=80"},
                {"title": "Web Assembly Unlocks High-Performance Browser Applications", "summary": "WASM adoption is accelerating, enabling compute-intensive apps like video editors and 3D engines to run natively in browsers.", "imageUrl": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=80"},
                {"title": "Accessibility-First Design as a Core Engineering Discipline", "summary": "Leading tech companies are embedding WCAG compliance into CI/CD pipelines, making accessibility a first-class engineering concern.", "imageUrl": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80"}
            ],
            "blockchain": [
                {"title": "Layer-2 Solutions Solve Ethereum's Scalability Trilemma", "summary": "Optimistic and ZK rollup networks are achieving thousands of TPS while inheriting Ethereum's security guarantees.", "imageUrl": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80"},
                {"title": "Decentralized Identity: Giving Users Control of Their Data", "summary": "Self-sovereign identity systems built on blockchain are gaining traction in academic credentialing and digital passports.", "imageUrl": "https://images.unsplash.com/photo-1621504450181-5d356f61d307?w=600&q=80"},
                {"title": "Smart Contract Auditing Tools Mature as DeFi Losses Mount", "summary": "Formal verification and AI-assisted auditing are becoming standard practice after high-profile DeFi protocol exploits.", "imageUrl": "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=600&q=80"}
            ],
            "devops": [
                {"title": "Platform Engineering Emerges as the Next DevOps Evolution", "summary": "Internal developer platforms are reducing cognitive load and standardizing deployment workflows across large engineering orgs.", "imageUrl": "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&q=80"},
                {"title": "GitOps Practices Accelerate Kubernetes Deployment Cycles", "summary": "Declarative Git-based workflows are enabling teams to manage complex Kubernetes infrastructure with full auditability.", "imageUrl": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&q=80"},
                {"title": "eBPF Technology Revolutionizes Cloud-Native Observability", "summary": "Extended Berkeley Packet Filter enables deep kernel-level tracing without instrumentation overhead in production environments.", "imageUrl": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80"}
            ],
            "iot": [
                {"title": "Smart Campus Infrastructure Powered by Edge AI", "summary": "Universities are deploying IoT sensor networks with on-device ML to optimize energy usage, classroom occupancy, and campus safety.", "imageUrl": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"},
                {"title": "MQTT 5.0 Brings Enhanced Security to Industrial IoT Deployments", "summary": "The latest MQTT protocol version adds payload format indicators and authentication mechanisms critical for OT/IT convergence.", "imageUrl": "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80"},
                {"title": "Digital Twin Technology Bridges Physical and Virtual Worlds", "summary": "Real-time simulation of physical systems via IoT data feeds is transforming manufacturing, healthcare, and smart city planning.", "imageUrl": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80"}
            ],
            "python": [
                {"title": "Python 3.13 Performance Gains Make It Competitive with Compiled Languages", "summary": "The new free-threaded CPython and JIT compiler experiments show 2-5x speedups in CPU-bound workloads.", "imageUrl": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&q=80"},
                {"title": "FastAPI Overtakes Flask as the Most-Used Python Web Framework", "summary": "Survey data from JetBrains shows FastAPI's async-native design and automatic OpenAPI docs driving rapid adoption in new projects.", "imageUrl": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80"},
                {"title": "Polars Challenges Pandas as the Default DataFrame Library", "summary": "The Rust-based Polars library offers 10-100x speedups for large dataset operations with a more consistent API.", "imageUrl": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80"}
            ],
            "deep learning": [
                {"title": "Diffusion Models Expand Beyond Images to Audio and Video", "summary": "State-of-the-art generative models are now producing broadcast-quality video and studio-quality audio from text descriptions.", "imageUrl": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80"},
                {"title": "Mixture-of-Experts Architectures Dominate Large Model Efficiency", "summary": "Sparse MoE models activate only a fraction of parameters per forward pass, enabling trillion-parameter models at lower compute cost.", "imageUrl": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80"},
                {"title": "Neuromorphic Computing Chips Promise 1000x Energy Efficiency", "summary": "Intel's Loihi 2 and IBM's NorthPole chips demonstrate that brain-inspired hardware could transform edge AI deployments.", "imageUrl": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80"}
            ],
            "natural language processing": [
                {"title": "Retrieval-Augmented Generation Becomes the Enterprise AI Standard", "summary": "RAG pipelines connecting LLMs to proprietary knowledge bases are replacing fine-tuning for most enterprise use cases.", "imageUrl": "https://images.unsplash.com/photo-1655635643532-fa9ba2648cbe?w=600&q=80"},
                {"title": "Multilingual Models Close the Global Language Equity Gap", "summary": "New models supporting 100+ languages at near-English performance levels are democratizing AI access for non-English speakers.", "imageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80"},
                {"title": "Structured Output from LLMs Enables Reliable Agentic Pipelines", "summary": "JSON mode and constrained decoding techniques allow language models to produce machine-parseable outputs consistently.", "imageUrl": "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=600&q=80"}
            ],
            "research methodology": [
                {"title": "Reproducibility Crisis Drives Adoption of Open Science Practices", "summary": "Journals and funding bodies now mandate pre-registration and data availability policies to combat publication bias.", "imageUrl": "https://images.unsplash.com/photo-1532094349884-543559759bca?w=600&q=80"},
                {"title": "AI-Assisted Literature Reviews Accelerate Systematic Research", "summary": "Tools like Elicit and Consensus are enabling researchers to synthesize hundreds of papers in hours rather than weeks.", "imageUrl": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80"},
                {"title": "Mixed Methods Research Gains Acceptance in STEM Disciplines", "summary": "Combining qualitative and quantitative approaches is increasingly recognized as producing richer, more impactful insights.", "imageUrl": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80"}
            ],
            "teaching pedagogy": [
                {"title": "Active Learning Spaces Transform Traditional Lecture Halls", "summary": "Universities redesigning classrooms with flexible seating and collaborative technology report 30% improvements in student engagement.", "imageUrl": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80"},
                {"title": "Competency-Based Education Models Gain Traction in Higher Ed", "summary": "Shifting from seat-time to demonstrated mastery enables students to progress at their own pace through learning objectives.", "imageUrl": "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80"},
                {"title": "AI Tutors Personalize Learning Pathways at Scale", "summary": "Intelligent tutoring systems are adapting content difficulty and presentation style in real-time based on individual learner responses.", "imageUrl": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80"}
            ],
            "dbms": [
                {"title": "NewSQL Databases Combine ACID Guarantees with Horizontal Scale", "summary": "CockroachDB and TiDB are winning enterprise adoption by offering distributed transactions without sacrificing consistency.", "imageUrl": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80"},
                {"title": "DuckDB Emerges as the SQLite for Analytical Workloads", "summary": "The embeddable OLAP database is transforming local data analysis workflows for data scientists and researchers alike.", "imageUrl": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80"},
                {"title": "Graph Databases Power Next-Generation Knowledge Graphs", "summary": "Neo4j and Amazon Neptune are enabling connected data use cases in fraud detection, recommendation engines, and research networks.", "imageUrl": "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=600&q=80"}
            ],
        }
        
        # Find matching templates or use generic ones
        content = templates.get("ai") # default
        for key in templates:
            if key in topic_lower:
                content = templates[key]
                break
                
        synthetic_items = []
        for i, item in enumerate(content[:limit]):
            article_id = hashlib.md5(f"synthetic_{topic}_{i}".encode()).hexdigest()
            synthetic_items.append(NewsItem(
                id=article_id,
                title=item["title"],
                summary=item["summary"],
                source="FSDP Professional Trends",
                publishedAt=(now - timedelta(hours=i*6)).isoformat(),
                url="#",
                imageUrl=item.get("imageUrl")
            ))
            
        return synthetic_items
