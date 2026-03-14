import { Link } from 'react-router-dom';
import { ArrowRight, Bot, BookOpen, CheckCircle2, GraduationCap, LineChart, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const highlights = [
  {
    title: 'Role-based Dashboards',
    description: 'Dedicated workflows for faculty and admins with clear ownership and visibility.',
    icon: ShieldCheck,
  },
  {
    title: 'Programs and Assessments',
    description: 'Launch structured programs, assessments, and practice paths from a single portal.',
    icon: BookOpen,
  },
  {
    title: 'AI-Powered Growth',
    description: 'Support faculty with adaptive insights, recommendations, and guided growth plans.',
    icon: Bot,
  },
  {
    title: 'Performance Analytics',
    description: 'Track progress, completion trends, and quality outcomes in real-time.',
    icon: LineChart,
  },
];

const gallery = [
  {
    title: 'Admin Dashboard',
    image: '/images/showcase/admin-dashboard.png',
    description: 'Live KPI cards, charts, and operational insights in a single view.',
  },
  {
    title: 'Course Management',
    image: '/images/showcase/admin-courses.png',
    description: 'Organize courses, publish modules, and monitor delivery status.',
  },
  {
    title: 'Faculty Dashboard',
    image: '/images/showcase/faculty-dashboard.png',
    description: 'Personalized progress tracking for active programs and assessments.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-600/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-wide text-slate-900">FSD.PORTAL</p>
              <p className="text-[11px] font-medium text-slate-500">Faculty Skill Development</p>
            </div>
          </div>
          <Link to="/login">
            <Button size="sm" className="px-5">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-4 top-8 h-64 w-64 rounded-full bg-blue-100 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-slate-200/80 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-12 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-16">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                Modern Faculty Enablement
              </p>
              <h1 className="text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
                One portal to plan, train, evaluate, and grow faculty excellence.
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
                Build a stronger learning culture with structured programs, guided assessments, and actionable AI insights.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/login">
                  <Button size="lg" className="gap-2">
                    Enter Portal
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Explore Features
                </a>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {['Programs', 'Assessments', 'AI Coach'].map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:row-span-2">
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/80">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <p className="ml-2 text-[11px] font-semibold text-slate-500">Admin Workspace</p>
                  </div>
                  <img
                    src="/images/showcase/admin-dashboard.png"
                    alt="Admin dashboard screenshot from the application"
                    className="h-full min-h-[340px] w-full object-cover object-top"
                  />
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
                <img
                  src="/images/showcase/faculty-dashboard.png"
                  alt="Faculty dashboard screenshot from the application"
                  className="h-40 w-full object-cover object-top sm:h-[164px]"
                />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
                <img
                  src="/images/showcase/faculty-growth-plan.png"
                  alt="Growth plan screen screenshot from the application"
                  className="h-40 w-full object-cover object-top sm:h-[164px]"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">Everything needed for professional development</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              A unified interface for managing faculty initiatives across training, practice, and performance analysis.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {highlights.map((feature) => (
              <Card key={feature.title} className="border-slate-200">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-white py-12 lg:py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">Inside the application</h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Real screens from your portal presented in a product-style showcase.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {gallery.map((item) => (
                <Card key={item.title} className="overflow-hidden border-slate-200">
                  <img src={item.image} alt={item.title} className="h-44 w-full object-cover object-top" />
                  <CardContent className="p-5">
                    <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <Card className="overflow-hidden border-slate-200 bg-gradient-to-r from-blue-700 to-blue-600 text-white">
            <CardContent className="flex flex-col gap-8 p-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">Ready to Begin</p>
                <h3 className="mt-2 text-3xl font-black text-white">Empower faculty with one consistent platform.</h3>
                <ul className="mt-4 space-y-2 text-sm text-blue-100">
                  {['Skill progression tracking', 'AI-guided recommendations', 'Assessment-driven outcomes'].map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="secondary"
                  className="min-w-44 bg-white text-blue-700 hover:bg-blue-50"
                >
                  Sign In to Portal
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
