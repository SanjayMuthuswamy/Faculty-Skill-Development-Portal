import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api/analytics';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Download, TrendingUp, Sparkles, Target, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';

export default function AdminReports() {
    const { data: rawDeptStats, isLoading } = useQuery({
        queryKey: ['departmentSummary'],
        queryFn: analyticsApi.getDepartmentSummary,
    });

    const deptStats = useMemo(() => {
        if (!Array.isArray(rawDeptStats)) return [];
        return rawDeptStats.map(d => ({
            dept: d?.department || 'General',
            planAdoption: Math.round(Number(d?.plan_adoption_rate || 0)),
            avgPracticeScore: Math.round(Number(d?.avg_accuracy || 0)),
            programs: Number(d?.total_enrollments || 0),
            facultyCount: Number(d?.faculty_count || 0),
            verifiedRate: Math.round(Number(d?.verified_skills_rate || 0))
        }));
    }, [rawDeptStats]);

    const globalKPIs = useMemo(() => {
        if (!deptStats || deptStats.length === 0) return { adoption: 0, accuracy: '0.0', verification: 0 };

        const totalFaculty = deptStats.reduce((acc, curr) => acc + (curr?.facultyCount || 0), 0);
        if (totalFaculty === 0) return { adoption: 0, accuracy: '0.0', verification: 0 };

        const weightedAdoption = deptStats.reduce((acc, curr) => acc + (curr.planAdoption * curr.facultyCount), 0) / totalFaculty;
        const weightedAccuracy = deptStats.reduce((acc, curr) => acc + (curr.avgPracticeScore * curr.facultyCount), 0) / totalFaculty;
        const weightedVerification = deptStats.reduce((acc, curr) => acc + (curr.verifiedRate * curr.facultyCount), 0) / totalFaculty;

        return {
            adoption: Math.round(weightedAdoption),
            accuracy: weightedAccuracy.toFixed(1),
            verification: Math.round(weightedVerification)
        };
    }, [deptStats]);

    const handleExport = () => {
        if (!deptStats || deptStats.length === 0) return;
        const headers = ['Department', 'Plan Adoption (%)', 'Avg Practice Score (%)', 'Programs Enrolled', 'Faculty Count'];
        const csvContent = [
            headers.join(','),
            ...deptStats.map(row => `${row.dept},${row.planAdoption},${row.avgPracticeScore},${row.programs},${row.facultyCount}`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'fsdp_skill_reports.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Loading skill analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
                    <p className="text-gray-500">Department-wise skill development metrics</p>
                </div>
                <Button onClick={handleExport} disabled={deptStats.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export Skill Analytics
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-600 text-white border-none shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Growth Plan Adoption
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{globalKPIs.adoption}%</div>
                        <p className="text-xs text-blue-200 mt-1">Real-time adoption metrics</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-600 text-white border-none shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-100 flex items-center gap-2">
                            <Target className="h-4 w-4" /> Global Avg Accuracy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{globalKPIs.accuracy}%</div>
                        <p className="text-xs text-emerald-200 mt-1">Based on AI Practice Sets</p>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-600 text-white border-none shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-100 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Skill Verification Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{globalKPIs.verification}%</div>
                        <p className="text-xs text-indigo-200 mt-1">Verified certifications</p>
                    </CardContent>
                </Card>
            </div>

            {deptStats.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                    <TrendingUp className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No departmental data collected yet.</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Skill Development Velocity</CardTitle>
                                <CardDescription>Adoption vs Performance by department</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptStats}>
                                        <XAxis dataKey="dept" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Bar dataKey="planAdoption" name="Adoption %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="avgPracticeScore" name="Avg Practice %" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Resource Allocation</CardTitle>
                                <CardDescription>Program engagement across departments</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptStats} layout="vertical">
                                        <XAxis type="number" axisLine={false} tickLine={false} />
                                        <YAxis dataKey="dept" type="category" axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                        <Bar dataKey="programs" name="Active Programs" fill="#8b5cf6" barSize={20} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Departmental Performance Matrix</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Plan Adoption</TableHead>
                                        <TableHead>Avg Practice Score</TableHead>
                                        <TableHead>Total Programs</TableHead>
                                        <TableHead className="text-right">Growth Momentum</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deptStats.map((row) => (
                                        <TableRow key={row.dept}>
                                            <TableCell className="font-medium">{row.dept}</TableCell>
                                            <TableCell>{row.planAdoption}%</TableCell>
                                            <TableCell>{row.avgPracticeScore}%</TableCell>
                                            <TableCell>{row.programs}</TableCell>
                                            <TableCell className="text-right text-xs">
                                                {row.planAdoption >= 75 ? (
                                                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-100 italic">High</span>
                                                ) : row.planAdoption >= 50 ? (
                                                    <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold border border-amber-100 italic">Moderate</span>
                                                ) : (
                                                    <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-bold border border-red-100 italic">Critical</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
