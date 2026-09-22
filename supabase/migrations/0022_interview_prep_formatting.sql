-- ============================================================
-- 0022_interview_prep_formatting — 2026-09-22
-- Reformats the 20 topics seeded by 0021_interview_prep_seed with
-- Markdown (bold key terms, paragraph breaks, a "Key points" recap
-- list) and, for every topic, a ```mermaid fenced diagram — the
-- student reading view (app/student/interview-prep/[category]/page.tsx)
-- and the teacher's write/preview form now render `answer` through
-- components/interview-prep/AnswerContent.tsx, which turns a fenced
-- mermaid block into an actual rendered diagram instead of a text
-- block. Plain UPDATEs keyed by (category slug, exact topic name) —
-- naturally idempotent (safe to re-run; each row just gets the same
-- text written again), and deliberately not a rewrite of 0021 itself
-- since that migration may already have been run against a live
-- database.
-- ============================================================

-- ---------- OOP Concepts ----------

update interview_questions set answer = $$**Encapsulation** is the practice of bundling an object's data (its fields) together with the methods that operate on that data, while restricting direct access to some of the object's internal state. In practice, this means marking fields as **private** and exposing controlled access through public getter and setter methods, so the class itself decides what values are valid rather than trusting every caller to enforce that discipline.

```mermaid
classDiagram
    class BankAccount {
        -double balance
        +deposit(amount)
        +withdraw(amount)
        +getBalance() double
    }
```

For example, a `BankAccount` class keeps its `balance` field **private** and only allows it to change through a `withdraw()` method that checks for sufficient funds — no external code can set balance directly to an invalid negative number. The core benefit is that the internal implementation can change freely (switching from an array to a linked list, say) without breaking any code that depends on the class's public interface, as long as that interface's behavior stays the same. This is often called "information hiding," and it's what makes large codebases maintainable: a bug in how a class stores its data is contained to that class, not scattered across every place that touches it. Encapsulation also improves security, since sensitive fields can be made entirely inaccessible from outside, and it reduces coupling between classes, since consumers only need to know a class's public contract, not its internals.

**Key points:**
- Private fields + public methods — callers can't bypass validation by writing to a field directly.
- The implementation can change freely as long as the public interface's behavior stays the same.
- Most languages support this with access modifiers (`private`, `protected`, `public` in Java/C++, or a leading underscore convention in Python).
- Getters/setters can add validation, logging, or lazy computation transparently, invisible to the caller.$$
where question = 'Encapsulation' and category_id = (select id from interview_categories where slug = 'oop');

update interview_questions set answer = $$**Inheritance** lets one class (the subclass or derived class) acquire the fields and methods of another (the superclass or base class), establishing an "is-a" relationship between them. A `Car` class might inherit from a more general `Vehicle` class, automatically getting fields like `speed` and methods like `accelerate()` without redefining them, while adding or overriding behavior specific to cars.

```mermaid
classDiagram
    Vehicle <|-- Car
    Vehicle <|-- Truck
    class Vehicle {
        +int speed
        +accelerate()
    }
    class Car {
        +int numDoors
    }
    class Truck {
        +int cargoCapacity
    }
```

The main value is **code reuse**: common behavior is written once in the base class and shared by every subclass, instead of being copy-pasted everywhere. It also enables polymorphism — code written against the base type (a function that takes a `Vehicle`) can transparently work with any subclass (`Car`, `Truck`, `Motorcycle`) without knowing which one it actually received at runtime. Most object-oriented languages support single inheritance (one direct parent) for classes, though some allow multiple inheritance of behavior through interfaces or traits, which avoids the "diamond problem" ambiguity that comes from inheriting the same method from two different parents.

**Key points:**
- A common interview pitfall is overusing inheritance where composition would be more appropriate.
- Inheritance creates a **tight, permanent coupling** between classes — a subclass breaks if its parent's implementation changes.
- The standard guidance, "favor composition over inheritance," suggests reaching for inheritance only for genuine is-a relationships.
- Building more flexible behavior usually means having a class hold a reference to another (a has-a relationship) instead.$$
where question = 'Inheritance' and category_id = (select id from interview_categories where slug = 'oop');

update interview_questions set answer = $$**Polymorphism**, literally "many forms," is the ability for the same operation or method call to behave differently depending on the actual object it's invoked on. There are two main kinds: compile-time (static) polymorphism through method **overloading**, and runtime (dynamic) polymorphism through method **overriding**.

```mermaid
classDiagram
    Animal <|-- Dog
    Animal <|-- Cat
    class Animal {
        +makeSound()
    }
    class Dog {
        +makeSound()
    }
    class Cat {
        +makeSound()
    }
```

Overloading means defining multiple methods with the same name but different parameter lists, so the compiler picks the right one based on the arguments at compile time. Overriding means a subclass provides its own implementation of a method already defined in its superclass, and which version actually runs is decided at runtime based on the object's real type, not the type of the reference pointing to it. This is what makes a line like `Animal a = new Dog(); a.makeSound();` call `Dog`'s `makeSound()` even though `a` is declared as an `Animal` — the runtime looks up the method on the object's actual class via **dynamic dispatch**.

**Key points:**
- A function processing a list of `Shape` objects and calling `shape.area()` doesn't need to know whether each shape is a `Circle`, `Square`, or `Triangle`.
- Each object's own implementation runs correctly — that's the whole point.
- This is the foundation of many design patterns (Strategy, Template Method, Visitor).
- It's why interfaces and abstract classes are so useful: they let you program against a contract, not a concrete implementation.$$
where question = 'Polymorphism' and category_id = (select id from interview_categories where slug = 'oop');

update interview_questions set answer = $$**Abstraction** means exposing only the essential features of an object or system while hiding the complex implementation details behind a simpler interface. When you press a car's accelerator pedal, you don't need to know how fuel injection, combustion timing, or the transmission actually work — you just need the car to speed up.

```mermaid
classDiagram
    class Shape {
      <<interface>>
      +area() double
    }
    Shape <|.. Circle
    Shape <|.. Square
    class Circle {
      +area() double
    }
    class Square {
      +area() double
    }
```

In object-oriented programming, abstraction is typically implemented through **abstract classes** and **interfaces**: an abstract class can declare method signatures without providing a body, forcing every concrete subclass to supply its own implementation, while an interface goes further and defines a pure contract with no implementation at all. This lets you design systems around "what something does" rather than "how it does it," which is exactly what makes large systems manageable — a caller depends only on a stable, simple interface, while the implementation behind it is free to change.

**Key points:**
- Abstraction is often confused with encapsulation, since both involve "hiding" something — but they solve different problems.
- Encapsulation hides an object's internal **state** to protect its integrity.
- Abstraction hides implementation **complexity** to reduce what a caller needs to think about.
- A `List` interface hides whether the underlying implementation is array-backed or node-backed — code written against `List` works with either.$$
where question = 'Abstraction' and category_id = (select id from interview_categories where slug = 'oop');

-- ---------- DBMS ----------

update interview_questions set answer = $$**Normalization** is the process of organizing a relational database's tables and columns to reduce data redundancy and avoid update anomalies — situations where the same fact is stored in multiple places and can go out of sync. It's done by progressively applying a series of rules called "normal forms."

```mermaid
flowchart LR
    A["Unnormalized data"] --> B["1NF: atomic columns, unique rows"]
    B --> C["2NF: no partial dependency on the key"]
    C --> D["3NF: no transitive dependency"]
```

**First Normal Form (1NF)** requires every column to hold atomic (indivisible) values and every row to be unique — no repeating groups or comma-separated lists crammed into one field. **Second Normal Form (2NF)** builds on 1NF by requiring every non-key column to depend on the entire primary key, not just part of it — relevant when a table has a composite key. **Third Normal Form (3NF)** goes further, requiring that non-key columns depend only on the primary key and not on each other — for example, storing both a customer's city and their zip code in an orders table is a 3NF violation, since zip code determines city, not the order.

**Key points:**
- Most production schemas aim for 3NF or the stricter Boyce-Codd Normal Form (BCNF) as a practical target.
- Normalization eliminates redundancy and anomalies, but increases the number of tables and requires more joins.
- Some read-heavy systems deliberately **denormalize** (reintroduce redundancy) for performance, accepting the anomaly risk in exchange for fewer joins.
- Knowing when to normalize versus denormalize is a common system-design interview discussion.$$
where question = 'Normalization' and category_id = (select id from interview_categories where slug = 'dbms');

update interview_questions set answer = $$**ACID** is an acronym describing four guarantees a database transaction should provide to keep data reliable, especially when multiple operations or multiple users touch the database concurrently.

```mermaid
flowchart TD
    T["Database Transaction"] --> A["Atomicity: all or nothing"]
    T --> C["Consistency: valid state to valid state"]
    T --> I["Isolation: concurrent transactions don't interfere"]
    T --> D["Durability: committed changes survive a crash"]
```

**Atomicity** means a transaction is all-or-nothing — if a transfer debits one account and credits another, either both operations succeed or neither does; a failure partway through rolls back everything. **Consistency** means a transaction takes the database from one valid state to another, never violating defined rules like constraints, foreign keys, or triggers. **Isolation** means concurrent transactions don't interfere with each other's intermediate states — different isolation levels (read uncommitted, read committed, repeatable read, serializable) trade off strictness against performance. **Durability** means once a transaction commits, its changes survive even a crash immediately afterward, typically guaranteed by writing to a persistent transaction log before acknowledging the commit.

**Key points:**
- Together, ACID is what lets you reason about a database transactionally instead of worrying about partial failures or race conditions.
- It's the standard most relational databases (PostgreSQL, MySQL, Oracle) are built around.
- Many NoSQL systems relax some of these guarantees in exchange for scalability.
- Isolation level choice is a real production tradeoff, not just a theoretical detail.$$
where question = 'ACID Properties' and category_id = (select id from interview_categories where slug = 'dbms');

update interview_questions set answer = $$A database **index** is a separate data structure — usually a B-tree or a hash table — that stores a sorted or otherwise fast-to-search copy of one or more columns' values, each paired with a pointer back to the full row.

```mermaid
flowchart TD
    subgraph noindex["Without an index"]
        direction LR
        Q1["Query"] --> S1["Row 1"] --> S2["Row 2"] --> S3["Row 3 ..."] --> R1["Match"]
    end
    subgraph withindex["With an index"]
        direction LR
        Q2["Query"] --> B["B-tree lookup"] --> R2["Match"]
    end
```

Without an index, looking up a row by a column's value requires a **full table scan**: checking every single row, an O(n) operation that gets slower as the table grows. With an index on that column, the database can instead do something closer to a **binary search**, typically O(log n), jumping straight to the matching rows — the same benefit binary search has over linear search, just applied to database rows instead of an in-memory array. The tradeoff is that an index isn't free: it takes extra disk space, and every `INSERT`, `UPDATE`, or `DELETE` on the indexed column has to also update the index, which slows down writes.

**Key points:**
- Add indexes deliberately — typically on columns used often in `WHERE`, `JOIN`, or `ORDER BY` — not on every column.
- A primary key is automatically indexed; other (secondary) indexes are added explicitly.
- Composite indexes speed up queries filtering on several columns together, but column order matters.
- A composite index on `(a, b)` helps queries filtering on `a` alone or `a AND b`, but not `b` alone.$$
where question = 'Indexing' and category_id = (select id from interview_categories where slug = 'dbms');

update interview_questions set answer = $$A **JOIN** combines rows from two or more tables based on a related column between them, and the type of join determines which rows survive when a match isn't found on one side.

```mermaid
flowchart TD
    J["SQL JOIN types"] --> IJ["INNER JOIN: only rows matching in both tables"]
    J --> LJ["LEFT JOIN: all of the left table + matches from the right"]
    J --> RJ["RIGHT JOIN: all of the right table + matches from the left"]
    J --> FJ["FULL JOIN: everything from both, matched where possible"]
    J --> CJ["CROSS JOIN: every row paired with every row"]
```

An **INNER JOIN** returns only the rows that have a matching value in both tables — if an order references a `customer_id` that doesn't exist in the customers table, that order simply doesn't appear in the result. A **LEFT (OUTER) JOIN** returns every row from the left table regardless of whether a match exists on the right, filling in `NULL`s for the right table's columns when there's no match. A **RIGHT (OUTER) JOIN** is the mirror image. A **FULL (OUTER) JOIN** keeps every row from both tables, matching where possible. A **CROSS JOIN** produces the Cartesian product of both tables, with no matching condition at all.

**Key points:**
- Interviewers often ask you to reason about which rows survive a given join type on a small example table.
- Getting `INNER` vs. `LEFT` confused is one of the most common real-world SQL bugs.
- "Show me all customers, including ones with zero orders" is the classic `LEFT JOIN` use case.
- `CROSS JOIN` is rarely what you want unless you're deliberately generating combinations.$$
where question = 'Types of SQL Joins' and category_id = (select id from interview_categories where slug = 'dbms');

-- ---------- Operating Systems ----------

update interview_questions set answer = $$A **process** is an independent, running instance of a program, with its own private memory space (code, data, heap, stack) that the operating system isolates from every other process. A **thread** is a unit of execution within a process — all threads in the same process share that process's memory space, though each thread still gets its own stack and program counter.

```mermaid
flowchart TD
    subgraph PA["Process A"]
        MA[("Private Memory")]
        T1["Thread 1"] --> MA
        T2["Thread 2"] --> MA
    end
    subgraph PB["Process B"]
        MB[("Private Memory")]
        T3["Thread 1"] --> MB
    end
```

This shared-memory model is exactly why threads are lighter-weight than processes — creating a thread doesn't require setting up a whole new address space, just a new stack and scheduling entry, so context-switching between threads is faster than switching between processes. It's also exactly why threading is riskier: since threads share memory, one thread writing to shared data while another reads it, without proper synchronization via locks, mutexes, or semaphores, causes **race conditions**. Inter-process communication (IPC), by contrast, has to go through explicit OS-provided channels — pipes, sockets, shared memory segments, message queues — precisely because processes don't share memory by default.

**Key points:**
- Use multiple **processes** when you want strong isolation and fault tolerance.
- Use multiple **threads** within one process when you want to parallelize work that needs to share data efficiently.
- A crash in one process doesn't directly affect another; a bad thread can corrupt its whole process.
- IPC exists specifically because processes don't share memory by default.$$
where question = 'Process vs Thread' and category_id = (select id from interview_categories where slug = 'operating-systems');

update interview_questions set answer = $$A **deadlock** is a state where two or more processes (or threads) are each waiting on a resource held by another, forming a cycle where none of them can ever proceed.

```mermaid
flowchart LR
    P1["Process 1"] -- holds --> R1["Lock 1"]
    R1 -. waited by .-> P2["Process 2"]
    P2 -- holds --> R2["Lock 2"]
    R2 -. waited by .-> P1
```

The classic illustration: process A holds lock 1 and waits for lock 2, while process B holds lock 2 and waits for lock 1 — neither will ever release what it's holding, so both wait forever. Four conditions must all hold simultaneously for a deadlock to be possible, known as the **Coffman conditions**: mutual exclusion (a resource can only be held by one process at a time), hold and wait (a process holding one resource can request another), no preemption (a resource can't be forcibly taken away), and circular wait (a cycle of processes each waiting on the next).

**Key points:**
- Breaking any one Coffman condition prevents deadlock — that's how most practical solutions work.
- Enforcing a strict, global lock-acquisition order eliminates circular wait.
- Timeouts let a waiting process give up and release what it holds.
- Databases typically favor **detection-and-rollback** over prevention, since transactions are expected to be retryable.$$
where question = 'Deadlock' and category_id = (select id from interview_categories where slug = 'operating-systems');

update interview_questions set answer = $$**Virtual memory** is an abstraction that gives each process the illusion of having its own large, contiguous, private address space, even though the actual physical RAM is smaller and shared across every running process.

```mermaid
flowchart LR
    A["Process: virtual address"] --> B["MMU: page table lookup"]
    B -->|page in RAM| C["Physical RAM"]
    B -->|page not in RAM| D["Page fault"] --> E["Load from disk"] --> C
```

The operating system, with hardware support from the **Memory Management Unit (MMU)**, maps each process's virtual addresses to real physical addresses (or to disk) through page tables — memory is divided into fixed-size chunks called pages (commonly 4KB), and each page can be mapped independently. This indirection enables real isolation (two processes can both believe they own address `0x1000`, but the MMU maps each to a completely different physical location), lets total memory used exceed physical RAM (pages can be "swapped out" to disk and paged back in on demand), and enables memory-mapped files and lazy loading.

**Key points:**
- A **page fault** is what happens when a process touches a page that isn't currently in RAM.
- If a system doesn't have enough RAM and is constantly swapping, performance collapses — this is called **thrashing**.
- Disk access is orders of magnitude slower than RAM, which is why thrashing is so damaging.
- Virtual memory underlies everything from process isolation to how executables are loaded.$$
where question = 'Virtual Memory' and category_id = (select id from interview_categories where slug = 'operating-systems');

update interview_questions set answer = $$**CPU scheduling** is how an operating system decides which of several ready-to-run processes or threads gets the CPU next, since on a system with more runnable tasks than CPU cores, most of them have to wait their turn.

```mermaid
gantt
    dateFormat X
    axisFormat %L
    section Round Robin CPU
    P1 :done, p1, 0, 2
    P2 :done, p2, 2, 4
    P3 :done, p3, 4, 6
    P1 :active, p1b, 6, 8
    P2 :p2b, 8, 10
```

The scheduler's goal is usually to balance throughput, turnaround time, waiting time, and — for interactive systems — response time. **First-Come-First-Served (FCFS)** is the simplest, but a single long task can make everything behind it wait (the "convoy effect"). **Shortest Job First (SJF)** minimizes average waiting time but requires knowing task lengths in advance and can starve long tasks. **Round Robin** (shown above) gives each process a small fixed time slice before moving to the next, cycling through repeatedly — fair and responsive, but a badly-tuned quantum wastes time on context-switching or degrades toward FCFS.

**Key points:**
- **Priority scheduling** runs the highest-priority task first, but risks starving low-priority ones unless combined with "aging."
- Real operating systems (like Linux's CFS) use more sophisticated hybrid approaches.
- Understanding these classic algorithms is the foundation interviewers expect.
- The right choice always trades off throughput against fairness and responsiveness.$$
where question = 'CPU Scheduling' and category_id = (select id from interview_categories where slug = 'operating-systems');

-- ---------- Computer Networks ----------

update interview_questions set answer = $$The **OSI (Open Systems Interconnection) model** is a conceptual, seven-layer framework describing how data moves from an application on one machine to an application on another, with each layer handling a distinct responsibility.

```mermaid
flowchart TD
    A["7. Application"] --> B["6. Presentation"] --> C["5. Session"] --> D["4. Transport"] --> E["3. Network"] --> F["2. Data Link"] --> G["1. Physical"]
```

From bottom to top: the **Physical** layer deals with raw bits over a medium; the **Data Link** layer packages bits into frames and handles node-to-node delivery on the same local network (switches operate here); the **Network** layer handles logical addressing and routing between networks (IP addresses and routers live here); the **Transport** layer provides end-to-end communication (TCP or UDP); the **Session** layer manages connections between applications; the **Presentation** layer handles data translation, encryption, and compression; and the **Application** layer is where user-facing protocols live (HTTP, FTP, SMTP).

**Key points:**
- Real-world networking mostly follows the simpler four-layer **TCP/IP model**, which collapses several OSI layers together.
- The OSI model remains the standard teaching and reference framework because it cleanly separates concerns.
- It makes it easy to reason about where a given protocol or piece of hardware fits.
- "The network" isn't one monolithic thing — it's a stack of independent, cooperating layers.$$
where question = 'OSI Model' and category_id = (select id from interview_categories where slug = 'networking');

update interview_questions set answer = $$**TCP** and **UDP** are both transport-layer protocols, but they make very different tradeoffs between reliability and speed.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    Note over C,S: TCP - connection-oriented
    C->>S: SYN
    S->>C: SYN-ACK
    C->>S: ACK
    C->>S: Data (acknowledged, ordered)
    Note over C,S: UDP - connectionless
    C->>S: Datagram (fire and forget)
```

**TCP** is connection-oriented: before any data is sent, both ends perform a **three-way handshake** (SYN, SYN-ACK, ACK). Once established, TCP guarantees reliable, ordered delivery — every packet is acknowledged, lost packets are automatically retransmitted, and it does flow and congestion control. All of this reliability comes at the cost of overhead and latency. **UDP**, by contrast, is connectionless: there's no handshake, no acknowledgment, no guaranteed delivery or ordering — a packet is just fired off, and it's up to the application to handle loss if it cares.

**Key points:**
- UDP is significantly faster and lower-overhead, which is why it's used for video calls, streaming, and gaming.
- A dropped or late UDP packet is often better handled by skipping it than by pausing to retransmit.
- Use TCP when correctness and completeness matter more than speed (web pages, file transfers, email).
- Use UDP when speed and low latency matter more than perfect delivery.$$
where question = 'TCP vs UDP' and category_id = (select id from interview_categories where slug = 'networking');

update interview_questions set answer = $$**DNS (Domain Name System)** is the internet's distributed system for translating human-readable domain names, like `example.com`, into the numeric IP addresses computers actually use — often described as "the phone book of the internet."

```mermaid
sequenceDiagram
    participant B as Browser
    participant R as Resolver
    participant Root as Root Server
    participant TLD as .com TLD Server
    participant Auth as Authoritative Server
    B->>R: Resolve example.com
    R->>Root: Who handles .com?
    Root-->>R: TLD server address
    R->>TLD: Who handles example.com?
    TLD-->>R: Authoritative server address
    R->>Auth: What is the IP?
    Auth-->>R: IP address
    R-->>B: IP address
```

When a browser needs to resolve a domain, it typically first checks its local cache, then asks a **DNS resolver**, which itself may have the answer cached. If not, the resolver queries a hierarchy of servers as shown above, eventually reaching the **authoritative name server** for that domain. This chain usually completes in milliseconds and is heavily cached at every level — each DNS record has a **TTL** (time-to-live) controlling how long it can be cached, which is why DNS changes can take time to "propagate" globally.

**Key points:**
- DNS supports several record types beyond the basic **A** record (IPv4 address).
- **AAAA** (IPv6 address), **CNAME** (alias), **MX** (mail server), and **TXT** (arbitrary text) are common types.
- TXT records are often used for domain verification or email security like SPF/DKIM.
- Caching at every layer is what keeps DNS fast despite the multi-hop lookup chain.$$
where question = 'DNS (Domain Name System)' and category_id = (select id from interview_categories where slug = 'networking');

update interview_questions set answer = $$**HTTP** is the application-layer protocol browsers and servers use to request and send resources, and it's fundamentally a plain-text, request-response protocol — which means anyone intercepting the traffic can read or modify it.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    Note over C,S: HTTP - plain text
    C->>S: GET /page (unencrypted)
    Note over C,S: HTTPS - TLS handshake first
    C->>S: ClientHello
    S->>C: ServerHello + Certificate
    C->>S: Key exchange
    Note over C,S: Encrypted connection established
    C->>S: GET /page (encrypted)
```

**HTTPS (HTTP Secure)** solves this by running HTTP over **TLS**, which encrypts the connection before any HTTP data is exchanged. This involves a TLS handshake where the server presents a certificate (issued by a trusted Certificate Authority) proving its identity, and both sides negotiate a shared encryption key using asymmetric cryptography, then used for fast symmetric encryption of the rest of the session. This gives HTTPS three properties HTTP lacks: **confidentiality**, **integrity**, and **authentication**.

**Key points:**
- Confidentiality means data can't be read in transit.
- Integrity means data can't be silently modified.
- Authentication means you can verify you're actually talking to the real server, not an impostor.
- Modern browsers now flag plain HTTP sites as "not secure" — HTTPS is the default expectation today.$$
where question = 'HTTP vs HTTPS' and category_id = (select id from interview_categories where slug = 'networking');

-- ---------- System Design ----------

update interview_questions set answer = $$A **load balancer** sits in front of a pool of backend servers and distributes incoming requests across them, so no single server gets overwhelmed while others sit idle.

```mermaid
flowchart LR
    C["Clients"] --> LB["Load Balancer"]
    LB --> S1["Server 1"]
    LB --> S2["Server 2"]
    LB --> S3["Server 3"]
```

Beyond spreading load, a load balancer also improves availability: it can continuously health-check backend servers and automatically stop routing traffic to any that are down, so a single server failure doesn't take down the whole system. Common strategies include **round robin**, **least connections**, and **IP hash**. Load balancers can operate at different layers: **Layer 4** routes based on IP and port without inspecting content, which is fast but limited; **Layer 7** works at the application layer and can route based on the actual HTTP request — the URL path, headers, or cookies.

**Key points:**
- Health checks are what let a load balancer route around a dead server automatically.
- Layer 7 load balancing enables routing `/api` to one pool and `/images` to another.
- Load balancers are often deployed in redundant pairs to avoid becoming a single point of failure.
- Large systems layer them: a global load balancer directs traffic to regional load balancers.$$
where question = 'Load Balancing' and category_id = (select id from interview_categories where slug = 'system-design');

update interview_questions set answer = $$**Caching** means storing a copy of expensive-to-compute or expensive-to-fetch data somewhere faster to access, so repeated requests for the same thing can be served quickly.

```mermaid
flowchart LR
    C["Client Request"] --> Cache{"In cache?"}
    Cache -- Hit --> R1["Return cached value"]
    Cache -- Miss --> DB[("Database")] --> Store["Store in cache"] --> R2["Return value"]
```

The core insight is **locality of reference** — in most real systems, a small subset of data is accessed far more often than the rest, so caching just that subset captures most of the benefit. Caches can live at many layers: the browser, a CDN, in-memory within an application, or a dedicated layer like Redis or Memcached in front of a database. The two hardest problems in caching are **eviction** (what to remove when the cache is full — LRU, LFU) and **invalidation** (making sure the cache doesn't serve stale data once the source changes).

**Key points:**
- A **TTL** lets cache entries expire automatically without explicit invalidation logic.
- **Write-through** or **write-behind** caching updates the cache whenever the underlying data is written.
- Getting invalidation wrong is famously one of the trickiest problems in software.
- "There are only two hard things in computer science: cache invalidation and naming things."$$
where question = 'Caching' and category_id = (select id from interview_categories where slug = 'system-design');

update interview_questions set answer = $$Scaling a system means increasing its capacity to handle more load, and there are two fundamentally different ways to do it.

```mermaid
flowchart TD
    subgraph Vertical["Vertical scaling"]
        S1["One bigger server"]
    end
    subgraph Horizontal["Horizontal scaling"]
        LB["Load Balancer"] --> H1["Server 1"]
        LB --> H2["Server 2"]
        LB --> H3["Server 3"]
    end
```

**Vertical scaling** ("scaling up") means making a single machine more powerful — simple, since the application needs no architectural changes, but it has a hard ceiling on how much CPU and RAM one machine can have, and it's a single point of failure. **Horizontal scaling** ("scaling out") means adding more machines and distributing load across them, typically behind a load balancer — this avoids the hard ceiling and improves fault tolerance, since one server failing out of many doesn't take down the whole system.

**Key points:**
- Horizontal scaling raises real challenges around state, data consistency, and coordination across machines.
- Where does session data live if requests can hit any server? That question drives a lot of architecture decisions.
- Most large-scale systems rely on horizontal scaling for core capacity.
- Vertical scaling still gets used for components that are hard to distribute, like a primary database.$$
where question = 'Horizontal vs Vertical Scaling' and category_id = (select id from interview_categories where slug = 'system-design');

update interview_questions set answer = $$**Sharding** is a technique for horizontally scaling a database by splitting its data across multiple separate database instances (shards), where each shard holds a distinct subset of the overall dataset.

```mermaid
flowchart LR
    Q["Query with shard key"] --> R{"Router"}
    R -->|key range A-M| S1[("Shard 1")]
    R -->|key range N-Z| S2[("Shard 2")]
```

This is different from **replication**, which keeps identical full copies of the data on multiple servers — sharding instead partitions the data itself. The central design decision is choosing a **shard key**. Hashing a key like `user_id` tends to distribute data evenly; **range-based** sharding (e.g., users A-M on shard 1, N-Z on shard 2) is simpler to reason about but can lead to uneven load if the ranges aren't balanced.

**Key points:**
- Queries that need to join or aggregate data across shards become much harder and slower.
- A bad shard key choice can create "hot shards" that get disproportionate traffic.
- **Resharding** — redistributing data when you add more shards later — is a genuinely difficult operational problem.
- Sharding is usually a scaling technique of last resort, reached for after caching, indexing, and read replicas.$$
where question = 'Database Sharding' and category_id = (select id from interview_categories where slug = 'system-design');
