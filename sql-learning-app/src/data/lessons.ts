export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  difficulty: Difficulty;
  xp: number;
  concept: string;
  explanation: string;
  schema: string;
  seedData: string;
  challenge: string;
  hint: string;
  solution: string;
  expectedColumns: string[];
  validateFn?: (rows: Record<string, unknown>[]) => boolean;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  color: string;
  lessons: Lesson[];
}

const SHARED_ECOMMERCE_SCHEMA = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  city TEXT,
  joined_year INTEGER
);
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price REAL,
  stock INTEGER
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  order_date TEXT,
  total REAL
);
`;

const ECOMMERCE_DATA = `
INSERT INTO customers VALUES
(1,'Alice Johnson','alice@mail.com','New York',2021),
(2,'Bob Smith','bob@mail.com','Chicago',2020),
(3,'Carol White','carol@mail.com','Los Angeles',2022),
(4,'David Lee','david@mail.com','New York',2019),
(5,'Eva Martinez','eva@mail.com','Houston',2023),
(6,'Frank Brown','frank@mail.com','Chicago',2021),
(7,'Grace Kim','grace@mail.com','Seattle',2022),
(8,'Henry Davis','henry@mail.com','New York',2020);

INSERT INTO products VALUES
(1,'Wireless Headphones','Electronics',89.99,45),
(2,'Running Shoes','Footwear',129.99,30),
(3,'Coffee Maker','Kitchen',79.99,20),
(4,'Yoga Mat','Sports',39.99,60),
(5,'Laptop Stand','Electronics',49.99,25),
(6,'Protein Powder','Health',54.99,40),
(7,'Water Bottle','Sports',24.99,80),
(8,'Desk Lamp','Electronics',34.99,35);

INSERT INTO orders VALUES
(1,1,1,1,order_date,89.99),(2,1,4,2,order_date,79.98),(3,2,2,1,order_date,129.99),
(4,3,3,1,order_date,79.99),(5,4,5,2,order_date,99.98),(6,5,7,3,order_date,74.97),
(7,6,6,1,order_date,54.99),(8,7,1,1,order_date,89.99),(9,8,8,2,order_date,69.98),
(10,1,2,1,order_date,129.99),(11,2,4,1,order_date,39.99),(12,3,7,2,order_date,49.98),
(13,4,3,1,order_date,79.99),(14,5,1,1,order_date,89.99),(15,6,5,1,order_date,49.99);
`.replace(/order_date/g, "'2024-01-15'");

export const modules: Module[] = [
  {
    id: 'basics',
    title: 'SQL Basics',
    description: 'Start your SQL journey',
    color: 'from-blue-500 to-cyan-500',
    lessons: [
      {
        id: 'select-all',
        title: 'Your First Query',
        subtitle: 'SELECT everything',
        icon: '🚀',
        difficulty: 'beginner',
        xp: 50,
        concept: 'SELECT *',
        explanation: `The **SELECT** statement retrieves data from a table. The **\`*\`** wildcard means "all columns".\n\n\`\`\`sql\nSELECT * FROM table_name;\n\`\`\`\n\nThink of it like asking: *"Show me everything in this spreadsheet."*`,
        schema: `CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT,
  city TEXT
);`,
        seedData: `INSERT INTO customers VALUES
(1,'Alice Johnson','alice@mail.com','New York'),
(2,'Bob Smith','bob@mail.com','Chicago'),
(3,'Carol White','carol@mail.com','Los Angeles'),
(4,'David Lee','david@mail.com','New York');`,
        challenge: 'Write a query to see **all customers** in the database.',
        hint: 'Use SELECT * FROM customers — the * means "all columns"',
        solution: 'SELECT * FROM customers',
        expectedColumns: ['id', 'name', 'email', 'city'],
        validateFn: (rows) => rows.length === 4,
      },
      {
        id: 'select-columns',
        title: 'Pick Your Columns',
        subtitle: 'SELECT specific fields',
        icon: '🎯',
        difficulty: 'beginner',
        xp: 75,
        concept: 'SELECT columns',
        explanation: `Instead of **\`*\`**, list the specific columns you want. This is faster and cleaner.\n\n\`\`\`sql\nSELECT name, email FROM customers;\n\`\`\`\n\nSeparate column names with **commas**.`,
        schema: `CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT,
  category TEXT,
  price REAL,
  stock INTEGER
);`,
        seedData: `INSERT INTO products VALUES
(1,'Wireless Headphones','Electronics',89.99,45),
(2,'Running Shoes','Footwear',129.99,30),
(3,'Coffee Maker','Kitchen',79.99,20),
(4,'Yoga Mat','Sports',39.99,60);`,
        challenge: 'Retrieve only the **name** and **price** of all products.',
        hint: 'SELECT name, price FROM products',
        solution: 'SELECT name, price FROM products',
        expectedColumns: ['name', 'price'],
        validateFn: (rows) => rows.length === 4 && 'name' in rows[0] && 'price' in rows[0] && !('id' in rows[0]),
      },
      {
        id: 'where-clause',
        title: 'Filter Your Data',
        subtitle: 'WHERE conditions',
        icon: '🔍',
        difficulty: 'beginner',
        xp: 100,
        concept: 'WHERE',
        explanation: `**WHERE** filters rows based on a condition. Only rows that match are returned.\n\n\`\`\`sql\nSELECT * FROM customers\nWHERE city = 'New York';\n\`\`\`\n\nUse **=** for equality, **>** or **<** for comparisons.`,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Find all customers who live in **\'New York\'**.',
        hint: "Add WHERE city = 'New York' after FROM customers",
        solution: "SELECT * FROM customers WHERE city = 'New York'",
        expectedColumns: ['id', 'name', 'email', 'city', 'joined_year'],
        validateFn: (rows) => rows.length === 3 && rows.every((r) => r.city === 'New York'),
      },
      {
        id: 'order-by',
        title: 'Sort Results',
        subtitle: 'ORDER BY',
        icon: '📊',
        difficulty: 'beginner',
        xp: 100,
        concept: 'ORDER BY',
        explanation: `**ORDER BY** sorts results. Add **DESC** for largest-first, or **ASC** (default) for smallest-first.\n\n\`\`\`sql\nSELECT name, price FROM products\nORDER BY price DESC;\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Show all products sorted by **price** from highest to lowest.',
        hint: 'Use ORDER BY price DESC at the end of your query',
        solution: 'SELECT * FROM products ORDER BY price DESC',
        expectedColumns: ['id', 'name', 'category', 'price', 'stock'],
        validateFn: (rows) => {
          for (let i = 1; i < rows.length; i++) {
            if ((rows[i].price as number) > (rows[i - 1].price as number)) return false;
          }
          return rows.length > 0;
        },
      },
      {
        id: 'limit',
        title: 'Limit Results',
        subtitle: 'LIMIT and OFFSET',
        icon: '✂️',
        difficulty: 'beginner',
        xp: 75,
        concept: 'LIMIT',
        explanation: `**LIMIT** caps how many rows are returned — great for previews and pagination.\n\n\`\`\`sql\nSELECT * FROM products\nORDER BY price DESC\nLIMIT 3;\n\`\`\`\n\nAlways pair LIMIT with ORDER BY for consistent results.`,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Get the **top 3 most expensive** products by price.',
        hint: 'ORDER BY price DESC, then LIMIT 3',
        solution: 'SELECT * FROM products ORDER BY price DESC LIMIT 3',
        expectedColumns: ['id', 'name', 'category', 'price', 'stock'],
        validateFn: (rows) => rows.length === 3 && (rows[0].price as number) >= (rows[1].price as number),
      },
    ],
  },
  {
    id: 'filtering',
    title: 'Advanced Filtering',
    description: 'Narrow down your data',
    color: 'from-violet-500 to-purple-600',
    lessons: [
      {
        id: 'and-or',
        title: 'Combine Conditions',
        subtitle: 'AND / OR logic',
        icon: '🔗',
        difficulty: 'beginner',
        xp: 125,
        concept: 'AND / OR',
        explanation: `Combine multiple conditions with **AND** (both must be true) or **OR** (either can be true).\n\n\`\`\`sql\nSELECT * FROM products\nWHERE category = 'Electronics'\n  AND price < 60;\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Find products in **\'Electronics\'** category with **price under $60**.',
        hint: "WHERE category = 'Electronics' AND price < 60",
        solution: "SELECT * FROM products WHERE category = 'Electronics' AND price < 60",
        expectedColumns: ['id', 'name', 'category', 'price', 'stock'],
        validateFn: (rows) => rows.every((r) => r.category === 'Electronics' && (r.price as number) < 60),
      },
      {
        id: 'like',
        title: 'Pattern Matching',
        subtitle: 'LIKE with wildcards',
        icon: '🃏',
        difficulty: 'beginner',
        xp: 125,
        concept: 'LIKE',
        explanation: `**LIKE** matches text patterns. Use **%** as a wildcard for any number of characters.\n\n\`\`\`sql\nSELECT * FROM customers\nWHERE name LIKE 'A%'; -- starts with A\nWHERE email LIKE '%@gmail%'; -- contains @gmail\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Find all customers whose **name starts with the letter "A" or "B"** (use two LIKE conditions with OR).',
        hint: "WHERE name LIKE 'A%' OR name LIKE 'B%'",
        solution: "SELECT * FROM customers WHERE name LIKE 'A%' OR name LIKE 'B%'",
        expectedColumns: ['id', 'name', 'email', 'city', 'joined_year'],
        validateFn: (rows) => rows.length === 2,
      },
      {
        id: 'in-clause',
        title: 'Match a List',
        subtitle: 'IN operator',
        icon: '📋',
        difficulty: 'intermediate',
        xp: 150,
        concept: 'IN',
        explanation: `**IN** lets you match against a list of values — cleaner than multiple ORs.\n\n\`\`\`sql\nSELECT * FROM customers\nWHERE city IN ('New York', 'Chicago');\n-- Same as: WHERE city = 'New York' OR city = 'Chicago'\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Get all customers from **\'New York\'** or **\'Chicago\'** using IN.',
        hint: "WHERE city IN ('New York', 'Chicago')",
        solution: "SELECT * FROM customers WHERE city IN ('New York', 'Chicago')",
        expectedColumns: ['id', 'name', 'email', 'city', 'joined_year'],
        validateFn: (rows) => rows.length === 5 && rows.every((r) => r.city === 'New York' || r.city === 'Chicago'),
      },
      {
        id: 'between',
        title: 'Range Queries',
        subtitle: 'BETWEEN',
        icon: '📏',
        difficulty: 'intermediate',
        xp: 125,
        concept: 'BETWEEN',
        explanation: `**BETWEEN** filters rows where a value falls within a range (inclusive).\n\n\`\`\`sql\nSELECT * FROM products\nWHERE price BETWEEN 40 AND 90;\n-- Includes both 40 and 90\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Find all products priced **between $40 and $90** (inclusive).',
        hint: 'WHERE price BETWEEN 40 AND 90',
        solution: 'SELECT * FROM products WHERE price BETWEEN 40 AND 90',
        expectedColumns: ['id', 'name', 'category', 'price', 'stock'],
        validateFn: (rows) => rows.length > 0 && rows.every((r) => (r.price as number) >= 40 && (r.price as number) <= 90),
      },
    ],
  },
  {
    id: 'aggregates',
    title: 'Aggregates & Groups',
    description: 'Summarize your data',
    color: 'from-emerald-500 to-teal-600',
    lessons: [
      {
        id: 'count',
        title: 'Count Rows',
        subtitle: 'COUNT function',
        icon: '🔢',
        difficulty: 'beginner',
        xp: 125,
        concept: 'COUNT()',
        explanation: `**COUNT()** returns how many rows match your query.\n\n\`\`\`sql\nSELECT COUNT(*) FROM customers;\n-- Returns: 8\n\nSELECT COUNT(*) FROM customers\nWHERE city = 'New York';\n-- Returns: 3\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Count **how many products** are in the database.',
        hint: 'SELECT COUNT(*) FROM products',
        solution: 'SELECT COUNT(*) FROM products',
        expectedColumns: ['COUNT(*)'],
        validateFn: (rows) => rows.length === 1,
      },
      {
        id: 'sum-avg',
        title: 'Sum & Average',
        subtitle: 'SUM, AVG, MIN, MAX',
        icon: '📈',
        difficulty: 'beginner',
        xp: 150,
        concept: 'SUM / AVG',
        explanation: `Aggregate functions compute a single value from many rows:\n\n\`\`\`sql\nSELECT\n  SUM(price)  AS total,\n  AVG(price)  AS average,\n  MIN(price)  AS cheapest,\n  MAX(price)  AS priciest\nFROM products;\n\`\`\`\n\n**AS** renames the column in results.`,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Find the **average price** and **maximum price** of all products.',
        hint: 'SELECT AVG(price), MAX(price) FROM products',
        solution: 'SELECT AVG(price) AS avg_price, MAX(price) AS max_price FROM products',
        expectedColumns: [],
        validateFn: (rows) => rows.length === 1 && Object.keys(rows[0]).length === 2,
      },
      {
        id: 'group-by',
        title: 'Group & Aggregate',
        subtitle: 'GROUP BY',
        icon: '🗂️',
        difficulty: 'intermediate',
        xp: 200,
        concept: 'GROUP BY',
        explanation: `**GROUP BY** splits rows into groups, then aggregates each group separately.\n\n\`\`\`sql\nSELECT city, COUNT(*) AS customers\nFROM customers\nGROUP BY city;\n-- One row per city\n\`\`\`\n\nEvery column in SELECT must either be in GROUP BY or inside an aggregate function.`,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Count **how many customers** are in each **city**.',
        hint: 'SELECT city, COUNT(*) FROM customers GROUP BY city',
        solution: 'SELECT city, COUNT(*) AS customer_count FROM customers GROUP BY city',
        expectedColumns: ['city'],
        validateFn: (rows) => rows.length > 1 && rows.every((r) => 'city' in r),
      },
      {
        id: 'having',
        title: 'Filter Groups',
        subtitle: 'HAVING clause',
        icon: '🧹',
        difficulty: 'intermediate',
        xp: 200,
        concept: 'HAVING',
        explanation: `**WHERE** filters rows before grouping. **HAVING** filters groups after aggregation.\n\n\`\`\`sql\nSELECT city, COUNT(*) AS total\nFROM customers\nGROUP BY city\nHAVING total >= 2;\n-- Only cities with 2+ customers\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Show only cities that have **2 or more customers**.',
        hint: 'GROUP BY city HAVING COUNT(*) >= 2',
        solution: 'SELECT city, COUNT(*) AS customer_count FROM customers GROUP BY city HAVING customer_count >= 2',
        expectedColumns: ['city'],
        validateFn: (rows) => rows.length > 0 && rows.every((r) => (r.customer_count as number) >= 2),
      },
    ],
  },
  {
    id: 'joins',
    title: 'Joining Tables',
    description: 'Combine data from multiple tables',
    color: 'from-orange-500 to-amber-500',
    lessons: [
      {
        id: 'inner-join',
        title: 'Inner Join',
        subtitle: 'Match rows between tables',
        icon: '🔀',
        difficulty: 'intermediate',
        xp: 250,
        concept: 'INNER JOIN',
        explanation: `**JOIN** (or **INNER JOIN**) combines rows from two tables where the join condition matches.\n\n\`\`\`sql\nSELECT customers.name, orders.total\nFROM customers\nJOIN orders ON customers.id = orders.customer_id;\n\`\`\`\n\nOnly rows that have a match in BOTH tables are returned.`,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Show each **order** with the **customer\'s name** and the **order total**.',
        hint: 'JOIN customers ON customers.id = orders.customer_id',
        solution: 'SELECT customers.name, orders.total FROM orders JOIN customers ON customers.id = orders.customer_id',
        expectedColumns: ['name', 'total'],
        validateFn: (rows) => rows.length > 0 && 'name' in rows[0] && 'total' in rows[0],
      },
      {
        id: 'multi-join',
        title: 'Multi-Table Join',
        subtitle: 'Chain multiple JOINs',
        icon: '⛓️',
        difficulty: 'intermediate',
        xp: 300,
        concept: 'Multiple JOINs',
        explanation: `You can chain multiple JOINs to combine three or more tables.\n\n\`\`\`sql\nSELECT c.name, p.name AS product, o.quantity\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nJOIN products p ON p.id = o.product_id;\n\`\`\`\n\nUse **aliases** (like \`o\`, \`c\`, \`p\`) to keep queries short.`,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Show customer **name**, product **name**, and **quantity** for all orders.',
        hint: 'Join orders → customers AND orders → products using aliases',
        solution: 'SELECT c.name AS customer, p.name AS product, o.quantity FROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id',
        expectedColumns: ['customer', 'product', 'quantity'],
        validateFn: (rows) => rows.length > 0 && 'quantity' in rows[0],
      },
      {
        id: 'left-join',
        title: 'Left Join',
        subtitle: 'Keep all left rows',
        icon: '⬅️',
        difficulty: 'intermediate',
        xp: 275,
        concept: 'LEFT JOIN',
        explanation: `**LEFT JOIN** returns ALL rows from the left table, plus matched rows from the right. Unmatched right-side values are **NULL**.\n\n\`\`\`sql\nSELECT c.name, o.total\nFROM customers c\nLEFT JOIN orders o ON c.id = o.customer_id;\n-- Customers WITHOUT orders still appear (total = NULL)\n\`\`\``,
        schema: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total REAL);`,
        seedData: `INSERT INTO customers VALUES (1,'Alice','NY'),(2,'Bob','LA'),(3,'Carol','NY'),(4,'Dave','TX');
INSERT INTO orders VALUES (1,1,89.99),(2,1,45.00),(3,3,129.99);`,
        challenge: 'List **all customers** and their order totals. Customers with **no orders** should still appear with NULL.',
        hint: 'Use LEFT JOIN orders ON customers.id = orders.customer_id',
        solution: 'SELECT customers.name, orders.total FROM customers LEFT JOIN orders ON customers.id = orders.customer_id',
        expectedColumns: ['name', 'total'],
        validateFn: (rows) => rows.some((r) => r.total === null),
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced SQL',
    description: 'Level up your skills',
    color: 'from-rose-500 to-pink-600',
    lessons: [
      {
        id: 'subquery',
        title: 'Subqueries',
        subtitle: 'Queries inside queries',
        icon: '🪆',
        difficulty: 'advanced',
        xp: 350,
        concept: 'Subquery',
        explanation: `A **subquery** is a query nested inside another query. The inner query runs first.\n\n\`\`\`sql\nSELECT name, price\nFROM products\nWHERE price > (\n  SELECT AVG(price) FROM products\n);\n-- Products more expensive than average\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Find all products with a price **above the average** product price.',
        hint: 'WHERE price > (SELECT AVG(price) FROM products)',
        solution: 'SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products)',
        expectedColumns: ['name', 'price'],
        validateFn: (rows) => rows.length > 0 && rows.length < 8,
      },
      {
        id: 'case-when',
        title: 'Conditional Logic',
        subtitle: 'CASE WHEN expressions',
        icon: '🔀',
        difficulty: 'advanced',
        xp: 300,
        concept: 'CASE WHEN',
        explanation: `**CASE WHEN** adds if-else logic inside a query — great for labeling or bucketing data.\n\n\`\`\`sql\nSELECT name, price,\n  CASE\n    WHEN price < 50  THEN 'Budget'\n    WHEN price < 100 THEN 'Mid-range'\n    ELSE 'Premium'\n  END AS tier\nFROM products;\n\`\`\``,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Label each product as **\'Budget\'** (< $50), **\'Mid-range\'** ($50–$99), or **\'Premium\'** ($100+) in a new column called **tier**.',
        hint: 'Use CASE WHEN price < 50 THEN ... WHEN price < 100 THEN ... ELSE ...',
        solution: "SELECT name, price, CASE WHEN price < 50 THEN 'Budget' WHEN price < 100 THEN 'Mid-range' ELSE 'Premium' END AS tier FROM products",
        expectedColumns: ['name', 'price', 'tier'],
        validateFn: (rows) => rows.length > 0 && 'tier' in rows[0],
      },
      {
        id: 'window-functions',
        title: 'Window Functions',
        subtitle: 'ROW_NUMBER & RANK',
        icon: '🪟',
        difficulty: 'advanced',
        xp: 400,
        concept: 'OVER()',
        explanation: `**Window functions** compute values across related rows without collapsing them.\n\n\`\`\`sql\nSELECT name, price,\n  RANK() OVER (ORDER BY price DESC) AS rank\nFROM products;\n-- Adds a rank column without losing any rows\n\`\`\`\n\nUnlike GROUP BY, all rows are preserved.`,
        schema: SHARED_ECOMMERCE_SCHEMA,
        seedData: ECOMMERCE_DATA,
        challenge: 'Rank all products by **price** (highest = rank 1). Show name, price, and rank.',
        hint: 'Use RANK() OVER (ORDER BY price DESC) AS rank',
        solution: 'SELECT name, price, RANK() OVER (ORDER BY price DESC) AS rank FROM products',
        expectedColumns: ['name', 'price', 'rank'],
        validateFn: (rows) => rows.length > 0 && 'rank' in rows[0] && rows[0].rank === 1,
      },
    ],
  },
];

export const allLessons = modules.flatMap((m) => m.lessons);
export const totalXP = allLessons.reduce((sum, l) => sum + l.xp, 0);
