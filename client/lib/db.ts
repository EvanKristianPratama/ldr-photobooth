import fs from 'fs';
import path from 'path';

// Define the simulated schema types
export interface Order {
  id: string;
  totalPrice: number;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  photoUrl: string;
  frameId: string;
  shippingAddress1: string; // JSON string of Alamat 1
  shippingAddress2: string; // JSON string of Alamat 2
  shippingCost1: number;
  shippingCost2: number;
  adminFee: number;
  creatorRoyalty: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorBalance {
  id: string;
  creatorId: string;
  accumulatedBalance: number;
  createdAt: string;
  updatedAt: string;
}

interface SimulatedDatabase {
  orders: Order[];
  creatorBalances: CreatorBalance[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'prisma', 'simulated_db.json');

// Helper to ensure database file exists
function ensureDbExists() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE_PATH)) {
    const initialData: SimulatedDatabase = {
      orders: [],
      creatorBalances: [
        {
          id: 'cb-1',
          creatorId: 'premium-frame-creator-1',
          accumulatedBalance: 25000, // Initial balance for demo
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Read database
function readDb(): SimulatedDatabase {
  ensureDbExists();
  try {
    const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading simulated DB, resetting:', error);
    return { orders: [], creatorBalances: [] };
  }
}

// Write database
function writeDb(data: SimulatedDatabase) {
  ensureDbExists();
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Simulated Prisma Client
export const prismaMock = {
  order: {
    async create(data: {
      data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'adminFee' | 'creatorRoyalty'> & {
        adminFee?: number;
        creatorRoyalty?: number;
      };
    }): Promise<Order> {
      const db = readDb();
      const newOrder: Order = {
        id: `ord-${Math.random().toString(36).substring(2, 11)}`,
        adminFee: data.data.adminFee ?? 1000,
        creatorRoyalty: data.data.creatorRoyalty ?? 5000,
        ...data.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.orders.push(newOrder);
      writeDb(db);
      return newOrder;
    },

    async update(args: {
      where: { id: string };
      data: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>;
    }): Promise<Order> {
      const db = readDb();
      const orderIndex = db.orders.findIndex((o) => o.id === args.where.id);
      if (orderIndex === -1) {
        throw new Error(`Order with ID ${args.where.id} not found.`);
      }

      const oldOrder = db.orders[orderIndex];
      const updatedOrder: Order = {
        ...oldOrder,
        ...args.data,
        updatedAt: new Date().toISOString(),
      };

      db.orders[orderIndex] = updatedOrder;

      // Accrual System Check:
      // If status transitions from not PAID to PAID, increment the creator's balance!
      if (oldOrder.status !== 'PAID' && args.data.status === 'PAID') {
        const creatorId = updatedOrder.frameId || 'default-creator';
        let balance = db.creatorBalances.find((cb) => cb.creatorId === creatorId);
        
        if (balance) {
          balance.accumulatedBalance += updatedOrder.creatorRoyalty;
          balance.updatedAt = new Date().toISOString();
        } else {
          db.creatorBalances.push({
            id: `cb-${Math.random().toString(36).substring(2, 11)}`,
            creatorId,
            accumulatedBalance: updatedOrder.creatorRoyalty,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      writeDb(db);
      return updatedOrder;
    },

    async findUnique(args: { where: { id: string } }): Promise<Order | null> {
      const db = readDb();
      return db.orders.find((o) => o.id === args.where.id) || null;
    },

    async findMany(): Promise<Order[]> {
      const db = readDb();
      return db.orders;
    },
  },

  creatorBalance: {
    async findUnique(args: { where: { creatorId: string } }): Promise<CreatorBalance | null> {
      const db = readDb();
      return db.creatorBalances.find((cb) => cb.creatorId === args.where.creatorId) || null;
    },

    async findMany(): Promise<CreatorBalance[]> {
      const db = readDb();
      return db.creatorBalances;
    },

    async upsert(args: {
      where: { creatorId: string };
      update: { accumulatedBalance: { increment?: number } | number };
      create: { creatorId: string; accumulatedBalance: number };
    }): Promise<CreatorBalance> {
      const db = readDb();
      let balanceIndex = db.creatorBalances.findIndex((cb) => cb.creatorId === args.where.creatorId);
      
      let balance: CreatorBalance;
      if (balanceIndex !== -1) {
        const oldBalance = db.creatorBalances[balanceIndex];
        let incrementValue = 0;
        if (typeof args.update.accumulatedBalance === 'object' && args.update.accumulatedBalance.increment) {
          incrementValue = args.update.accumulatedBalance.increment;
        } else if (typeof args.update.accumulatedBalance === 'number') {
          incrementValue = args.update.accumulatedBalance - oldBalance.accumulatedBalance;
        }
        
        balance = {
          ...oldBalance,
          accumulatedBalance: oldBalance.accumulatedBalance + incrementValue,
          updatedAt: new Date().toISOString(),
        };
        db.creatorBalances[balanceIndex] = balance;
      } else {
        balance = {
          id: `cb-${Math.random().toString(36).substring(2, 11)}`,
          creatorId: args.create.creatorId,
          accumulatedBalance: args.create.accumulatedBalance,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.creatorBalances.push(balance);
      }
      
      writeDb(db);
      return balance;
    }
  }
};
