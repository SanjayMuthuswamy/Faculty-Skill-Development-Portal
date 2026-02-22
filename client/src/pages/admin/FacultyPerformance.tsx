import { useParams } from 'react-router-dom';
import { FacultyList } from './FacultyList';
import { FacultyDetail } from './FacultyDetail';

export default function FacultyPerformance() {
    const { facultyId } = useParams();

    if (facultyId) {
        return <FacultyDetail />;
    }

    return <FacultyList />;
}
