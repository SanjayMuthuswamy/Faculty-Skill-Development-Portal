import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { programsApi, ProgramStatus } from '../../lib/api/programs';
import { enrollmentsApi } from '../../lib/api/enrollments';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Calendar, Users, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function FacultyPrograms() {
    const { user } = useAuth();

    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'online' | 'offline' | 'hybrid'>('all');

    const { data: programs, isLoading } = useQuery({
        queryKey: ['programs'],
        queryFn: () => programsApi.listPrograms(),
    });
    const { data: enrollments } = useQuery({
        queryKey: ['enrollments', user?.id],
        queryFn: enrollmentsApi.getMyEnrollments,
        enabled: !!user,
    });



    const filteredPrograms = programs?.filter(program => {
        const matchesSearch = program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            program.domain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMode = filterMode === 'all' || program.mode?.toLowerCase() === filterMode.toLowerCase();
        return matchesSearch && matchesMode;
    });

    const isEnrolled = (programId: string) => {
        return enrollments?.some(e => e.program_id === programId);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Training Programs</h1>
                    <p className="text-gray-500">Explore and enroll in skill development programs</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search programs..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-10 rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-32"
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value as any)}
                    >
                        <option value="all">All Modes</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <p>Loading programs...</p>
                ) : filteredPrograms?.map((program) => {
                    const enrolled = isEnrolled(program.id);
                    return (
                        <Card key={program.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant={
                                        program.status === ProgramStatus.UPCOMING ? 'default' :
                                            program.status === ProgramStatus.ONGOING ? 'success' : 'secondary'
                                    }>
                                        {program.status.toLowerCase()}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize">{program.mode}</Badge>
                                </div>
                                <CardTitle className="mt-2 text-xl">{program.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{program.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                        {program.domain}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {program.start_date ? format(new Date(program.start_date), 'MMM d') : 'TBD'} -
                                            {program.end_date ? format(new Date(program.end_date), 'MMM d, yyyy') : 'TBD'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{program.duration}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>{program.enrollments?.length || 0} / {program.seats} enrolled</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    onClick={() => navigate(`/faculty/programs/${program.id}`)}
                                    variant={enrolled ? "secondary" : "default"}
                                >
                                    {enrolled ? 'View Details' : 'View Details & Enroll'}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
                {filteredPrograms?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No programs found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
