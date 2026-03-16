export interface HealthResponse {
    code: number;
    status: string;
};

export interface AdminUser {
    userId: string;
    email: string;
    role: string;
    fullName: string;
    phone: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}