const MODULE_VIDEO_FALLBACKS: Record<string, string> = {
    'Reading Academic Dashboards': 'https://www.youtube.com/watch?v=hSPmj7mK6ng',
    'Turning Insights into Teaching Actions': 'https://www.youtube.com/watch?v=R2hb_BT-MxM',
    'Prompting for Teaching Tasks': 'https://www.youtube.com/watch?v=2ePf9rue1Ao',
    'Responsible AI Review': 'https://www.youtube.com/watch?v=aR5N2Jl8k14',
};

const COURSE_VIDEO_FALLBACKS: Record<string, string> = {
    'Modern Data Literacy for Faculty': 'https://www.youtube.com/watch?v=hSPmj7mK6ng',
    'Applied AI Workflows for Classroom Support': 'https://www.youtube.com/watch?v=hfIUstzHs9A',
    'Artificial Intelligence for Educators': 'https://www.youtube.com/watch?v=2ePf9rue1Ao',
    'Python Programming for Academic Research': 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
    'Cloud Computing Fundamentals': 'https://www.youtube.com/watch?v=M988_fsOSWo',
    'Effective Research Methodology': 'https://www.youtube.com/watch?v=b3VgC2WlNUQ',
    'Modern Teaching Strategies for Higher Education': 'https://www.youtube.com/watch?v=R2hb_BT-MxM',
    'Data Science for Academic Decision Making': 'https://www.youtube.com/watch?v=hSPmj7mK6ng',
};

export function hasUsableVideoUrl(videoUrl?: string | null) {
    const normalized = (videoUrl ?? '').trim().toLowerCase();
    return Boolean(normalized) && !normalized.includes('example.com');
}

export function getCourseModuleVideoUrl(params: {
    courseTitle?: string | null;
    moduleTitle?: string | null;
    videoUrl?: string | null;
}) {
    if (hasUsableVideoUrl(params.videoUrl)) {
        return (params.videoUrl ?? '').trim();
    }

    const moduleTitle = (params.moduleTitle ?? '').trim();
    if (moduleTitle && MODULE_VIDEO_FALLBACKS[moduleTitle]) {
        return MODULE_VIDEO_FALLBACKS[moduleTitle];
    }

    const courseTitle = (params.courseTitle ?? '').trim();
    if (courseTitle && COURSE_VIDEO_FALLBACKS[courseTitle]) {
        return COURSE_VIDEO_FALLBACKS[courseTitle];
    }

    const titleText = `${courseTitle} ${moduleTitle}`.toLowerCase();
    if (titleText.includes('ai') || titleText.includes('prompt')) {
        return 'https://www.youtube.com/watch?v=2ePf9rue1Ao';
    }
    if (titleText.includes('cloud') || titleText.includes('aws') || titleText.includes('infrastructure')) {
        return 'https://www.youtube.com/watch?v=M988_fsOSWo';
    }
    if (
        titleText.includes('python') ||
        titleText.includes('pandas') ||
        titleText.includes('dashboards') ||
        titleText.includes('data')
    ) {
        return 'https://www.youtube.com/watch?v=vmEHCJofslg';
    }
    if (
        titleText.includes('research') ||
        titleText.includes('literature') ||
        titleText.includes('methodology')
    ) {
        return 'https://www.youtube.com/watch?v=b3VgC2WlNUQ';
    }
    if (
        titleText.includes('teaching') ||
        titleText.includes('classroom') ||
        titleText.includes('learning')
    ) {
        return 'https://www.youtube.com/watch?v=R2hb_BT-MxM';
    }

    return 'https://www.youtube.com/watch?v=hfIUstzHs9A';
}
