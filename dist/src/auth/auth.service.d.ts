import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(email: string, pass: string): Promise<{
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
    register(name: string, email: string, pass: string): Promise<{
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
