import type { Course } from '../api/courses';

const UNSPLASH_PARAMS = 'auto=format&fit=crop&w=1400&q=80';

const COURSE_THUMBNAIL_MAP: Record<string, string> = {
    'AI in Teaching Practice': `https://images.unsplash.com/photo-1677691820099-a6e8040aa077?${UNSPLASH_PARAMS}`,
    'Applied AI Workflows for Classroom Support': `https://images.unsplash.com/photo-1677691824304-279660ceece3?${UNSPLASH_PARAMS}`,
    'Artificial Intelligence for Educators': `https://images.unsplash.com/photo-1584697964190-7383cbee8277?${UNSPLASH_PARAMS}`,
    'Python Programming for Academic Research': `https://images.unsplash.com/photo-1753545975907-dcb51efdd0d5?${UNSPLASH_PARAMS}`,
    'Cloud Computing Fundamentals': `https://images.unsplash.com/photo-1695668548342-c0c1ad479aee?${UNSPLASH_PARAMS}`,
    'Cloud Tools for Academic Delivery': `https://images.unsplash.com/photo-1717501219263-1c7f7d4cb97d?${UNSPLASH_PARAMS}`,
    'Effective Research Methodology': `https://images.unsplash.com/photo-1764096535068-0e9f652e03f6?${UNSPLASH_PARAMS}`,
    'Modern Teaching Strategies for Higher Education': `https://images.unsplash.com/photo-1649920442906-3c8ef428fb6e?${UNSPLASH_PARAMS}`,
    'Data Science for Academic Decision Making': `https://images.unsplash.com/photo-1551288049-bebda4e38f71?${UNSPLASH_PARAMS}`,
    'Modern Data Literacy for Faculty': `https://images.unsplash.com/photo-1551288049-bebda4e38f71?${UNSPLASH_PARAMS}`,
    'Reading Academic Dashboards': `https://images.unsplash.com/photo-1551288049-bebda4e38f71?${UNSPLASH_PARAMS}`,
    'Turning Insights into Teaching Actions': `https://images.unsplash.com/photo-1510531704581-5b2870972060?${UNSPLASH_PARAMS}`,
};

const KEYWORD_THUMBNAILS: Array<{ match: RegExp; url: string }> = [
    { match: /\b(ai|artificial intelligence|prompt)\b/i, url: `https://images.unsplash.com/photo-1584697964190-7383cbee8277?${UNSPLASH_PARAMS}` },
    { match: /\b(python|programming|coding|software|git|devops|network)\b/i, url: `https://images.unsplash.com/photo-1753545975907-dcb51efdd0d5?${UNSPLASH_PARAMS}` },
    { match: /\b(cloud|server|infrastructure)\b/i, url: `https://images.unsplash.com/photo-1695668548342-c0c1ad479aee?${UNSPLASH_PARAMS}` },
    { match: /\b(data|analytics|dashboard|literacy|visualization)\b/i, url: `https://images.unsplash.com/photo-1551288049-bebda4e38f71?${UNSPLASH_PARAMS}` },
    { match: /\b(research|writing|publication|methodology)\b/i, url: `https://images.unsplash.com/photo-1764096535068-0e9f652e03f6?${UNSPLASH_PARAMS}` },
    { match: /\b(teaching|classroom|curriculum|student|assessment|mentoring|learning)\b/i, url: `https://images.unsplash.com/photo-1649920442906-3c8ef428fb6e?${UNSPLASH_PARAMS}` },
];

export function getCourseThumbnailUrl(course: Pick<Course, 'title' | 'thumbnail_url'>): string | undefined {
    if (course.thumbnail_url) return course.thumbnail_url;

    const exactMatch = COURSE_THUMBNAIL_MAP[course.title];
    if (exactMatch) return exactMatch;

    return KEYWORD_THUMBNAILS.find((entry) => entry.match.test(course.title))?.url;
}
