// database/schema.ts

// User Schema
export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

// Submission Schema
export interface Submission {
    id: string;
    userId: string;
    data: any;
    createdAt: Date;
}

// Result Schema
export interface Result {
    id: string;
    submissionId: string;
    output: any;
    createdAt: Date;
}

// Configuration Schema
export interface Configuration {
    key: string;
    value: any;
    createdAt: Date;
}