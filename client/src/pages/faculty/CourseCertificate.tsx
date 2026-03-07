import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '../../lib/api/courses';
import { useAuth } from '../../app/providers/AuthProvider';
import { Award, Printer } from 'lucide-react';

export default function CourseCertificatePage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    const { data: course } = useQuery({
        queryKey: ['course', id],
        queryFn: () => coursesApi.getCourse(id!),
        enabled: !!id,
    });

    const { data: attempt } = useQuery({
        queryKey: ['course-attempt', id],
        queryFn: () => coursesApi.getMyAttempt(id!),
        enabled: !!id,
    });

    const completionDate = attempt?.submitted_at
        ? new Date(attempt.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800">Course Certificate</h1>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                    <Printer className="h-4 w-4" /> Print / Download PDF
                </button>
            </div>

            {/* Certificate */}
            <div
                id="certificate"
                className="bg-white border-8 border-blue-100 rounded-3xl p-12 text-center shadow-xl max-w-3xl mx-auto"
                style={{ fontFamily: 'Georgia, serif' }}
            >
                {/* Header */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                        <Award className="h-7 w-7 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase">Faculty Skill Development Portal</p>
                        <p className="text-lg font-bold text-slate-900">Certificate of Completion</p>
                    </div>
                </div>

                <div className="border-t-2 border-b-2 border-blue-100 py-8 my-6">
                    <p className="text-slate-500 text-sm mb-3">This is to certify that</p>
                    <h2 className="text-4xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                        {user?.name || 'Faculty Member'}
                    </h2>
                    <p className="text-slate-500 text-sm mb-3">has successfully completed the course</p>
                    <h3 className="text-2xl font-bold text-blue-600 mb-4">
                        {course?.title || 'Course Title'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                        with a score of <strong className="text-slate-700">{attempt?.score.toFixed(0) ?? 0}%</strong>
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-6 text-sm text-slate-500">
                    <div className="text-left">
                        <p className="font-bold text-slate-700">Date of Completion</p>
                        <p>{completionDate}</p>
                    </div>
                    <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-1 shadow-lg">
                            <Award className="h-10 w-10 text-white" />
                        </div>
                        <p className="text-xs text-slate-400">Official Seal</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-slate-700">Instructor</p>
                        <p>{course?.instructor_name || '—'}</p>
                    </div>
                </div>

                <p className="text-[10px] text-slate-300 mt-6">
                    FSD Portal · Certificate ID: {attempt?.id?.slice(0, 8).toUpperCase() ?? 'N/A'}
                </p>
            </div>

            <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #certificate, #certificate * { visibility: visible !important; }
          #certificate { position: fixed; inset: 0; margin: auto; border: none !important; box-shadow: none !important; }
        }
      `}</style>
        </div>
    );
}
