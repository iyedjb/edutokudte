import { type User } from "@shared/schema";

export interface IStorage {
  getUser(uid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: User): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(uid: string): Promise<User | undefined> {
    return this.users.get(uid);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(user: User): Promise<User> {
    this.users.set(user.uid, user);
    return user;
  }
}

export const storage = new MemStorage();
