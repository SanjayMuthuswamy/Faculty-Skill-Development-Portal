import http from './http'

export enum SkillDomain {
    TEACHING = "Teaching",
    RESEARCH = "Research",
    TECHNOLOGY = "Technology",
    LEADERSHIP = "Leadership",
    COMMUNICATION = "Communication",
    AI = "Artificial Intelligence",
    CLOUD = "Cloud Computing",
    DATA = "Data & Analytics",
    CYBER = "Cybersecurity",
}

export interface Skill {
    id: string;
    name: string;
    domain: SkillDomain;
    created_at: string;
}

export interface SkillCreate {
    name: string;
    domain: SkillDomain;
}

export const skillsApi = {
    listSkills: async (skip: number = 0, limit: number = 100): Promise<Skill[]> => {
        const response = await http.get<Skill[]>('/api/v1/skills/', {
            params: { skip, limit }
        });
        return response.data;
    },

    createSkill: async (skillData: SkillCreate): Promise<Skill> => {
        const response = await http.post<Skill>('/api/v1/skills/', skillData);
        return response.data;
    }
}
