import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { knowledgeDocs } from '@server/database/schema';
import { eq, and, desc, like } from 'drizzle-orm';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getDocs(userId: string, category?: string, keyword?: string) {
    const conditions = [eq(knowledgeDocs.userProfile, userId)];

    if (category && category !== 'all') {
      conditions.push(eq(knowledgeDocs.category, category));
    }

    if (keyword) {
      conditions.push(like(knowledgeDocs.title, `%${keyword}%`));
    }

    return this.db
      .select()
      .from(knowledgeDocs)
      .where(and(...conditions))
      .orderBy(desc(knowledgeDocs.isPinned), desc(knowledgeDocs.updatedAt));
  }

  async getDoc(id: string, userId: string) {
    const [doc] = await this.db
      .select()
      .from(knowledgeDocs)
      .where(and(eq(knowledgeDocs.id, id), eq(knowledgeDocs.userProfile, userId)));
    return doc;
  }

  async createDoc(data: { title: string; category?: string; content: string; source?: string; userProfile: string }) {
    const [doc] = await this.db.insert(knowledgeDocs).values(data).returning();
    return doc;
  }

  async updateDoc(id: string, userId: string, data: Partial<{ title: string; category: string; content: string; source: string; isPinned: boolean }>) {
    const [updated] = await this.db
      .update(knowledgeDocs)
      .set(data)
      .where(and(eq(knowledgeDocs.id, id), eq(knowledgeDocs.userProfile, userId)))
      .returning();
    return updated;
  }

  async deleteDoc(id: string, userId: string) {
    return this.db
      .delete(knowledgeDocs)
      .where(and(eq(knowledgeDocs.id, id), eq(knowledgeDocs.userProfile, userId)));
  }

  async getCategories(userId: string) {
    const docs = await this.db
      .select({ category: knowledgeDocs.category })
      .from(knowledgeDocs)
      .where(eq(knowledgeDocs.userProfile, userId));

    return [...new Set(docs.map(d => d.category))];
  }
}
