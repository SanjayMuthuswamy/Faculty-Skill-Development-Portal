import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programsApi, ProgramStatus } from '../../lib/api/programs';
import { enrollmentsApi } from '../../lib/api/enrollments';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../components/ui/Toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Users, Clock, ArrowLeft, CheckCircle2, List, Trophy, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ProgramDetails() {
    const { programId } = useParams<{ programId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const { data: program, isLoading: isLoadingProgram } = useQuery({
        queryKey: ['program', programId],
        queryFn: () => programsApi.getProgram(programId!),
        enabled: !!programId,
    });

    const { data: enrollments } = useQuery({
        queryKey: ['enrollments', user?.id],
        queryFn: enrollmentsApi.getMyEnrollments,
        enabled: !!user,
    });

    const enrollMutation = useMutation({
        mutationFn: () => enrollmentsApi.enroll({ program_id: programId! }),
        onSuccess: () => {
            addToast('Enrolled successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['programs'] });
            queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        },
        onError: (error: any) => {
            addToast(error.message || 'Failed to enroll', 'error');
        }
    });

    const isEnrolled = enrollments?.some(e => e.program_id === programId);

    if (isLoadingProgram) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-600" />
                <p>Loading program details...</p>
            </div>
        );
    }

    if (!program) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-2xl font-bold text-gray-800">Program Not Found</h2>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/faculty/programs')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <Button variant="ghost" onClick={() => navigate('/faculty/programs')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
            </Button>

            <div className="grid gap-6">
                {/* Header Section */}
                <Card className="border-l-4 border-l-blue-600">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={
                                        program.status === ProgramStatus.UPCOMING ? 'default' :
                                            program.status === ProgramStatus.ONGOING ? 'success' : 'secondary'
                                    }>
                                        {program.status.toLowerCase()}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize">{program.mode}</Badge>
                                </div>
                                <CardTitle className="text-3xl font-bold text-gray-900">{program.title}</CardTitle>
                            </div>
                            {isEnrolled ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1 text-sm">
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Enrolled
                                </Badge>
                            ) : null}
                        </div>
                        <CardDescription className="text-lg mt-2">{program.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Duration</p>
                                    <p className="font-semibold text-gray-900">
                                        {program.start_date ? format(new Date(program.start_date), 'MMM d') : 'TBD'} -
                                        {program.end_date ? format(new Date(program.end_date), 'MMM d, yyyy') : 'TBD'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Time Commitment</p>
                                    <p className="font-semibold text-gray-900">{program.duration}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Seats Available</p>
                                    <p className="font-semibold text-gray-900">{program.enrollments?.length || 0} / {program.seats} enrolled</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Topics Covered */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <List className="h-5 w-5 text-blue-600" />
                                Topics Covered
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {program.topics && program.topics.length > 0 ? (
                                    program.topics.map((topic, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                                            <span className="text-gray-700">{topic}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-gray-500 italic">No detailed topics listed available.</li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Benefits */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                Key Benefits
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {program.benefits && program.benefits.length > 0 ? (
                                    program.benefits.map((benefit, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                            <span className="text-gray-700">{benefit}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-gray-500 italic">No specific benefits listed.</li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Enrollment Action */}
                <Card className="bg-gray-50 border-dashed">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">Ready to upskill?</h3>
                        <p className="text-gray-600 max-w-md">
                            Join this program to enhance your teaching methodology and technical expertise.
                            {program.seats - (program.enrollments?.length || 0) < 5 && program.seats - (program.enrollments?.length || 0) > 0 && (
                                <span className="block mt-1 font-medium text-orange-600">Hurry, only {program.seats - (program.enrollments?.length || 0)} seats left!</span>
                            )}
                        </p>
                        {isEnrolled ? (
                            <Button size="lg" variant="secondary" disabled className="min-w-[200px]">
                                Already Enrolled
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="min-w-[200px]"
                                onClick={() => enrollMutation.mutate()}
                                disabled={enrollMutation.isPending || (program.enrollments?.length || 0) >= program.seats}
                            >
                                {enrollMutation.isPending ? 'Processing...' :
                                    (program.enrollments?.length || 0) >= program.seats ? 'Program Full' : 'Confirm Enrollment'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
