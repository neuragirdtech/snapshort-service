import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            plan: string;
            credits: number;
            subscriptionId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        token: string;
    }>;
    register(body: any): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            plan: string;
            credits: number;
            subscriptionId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        token: string;
    }>;
}
