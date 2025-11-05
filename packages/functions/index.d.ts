import type { Request, Response } from 'express';
import type { Session } from '@shopify/shopify-api';
import type { Firestore } from 'firebase-admin/firestore';

export interface ShopifyRequest extends Request {
  shopify: {
    session: Session;
    client: any;
    graphql<T = any>(query: string, variables?: any): Promise<T>;
  };
}

export function withShopify<T>(
  handler: (req: ShopifyRequest, res: Response) => T
): (req: Request, res: Response) => Promise<T>;

export const db: Firestore;
