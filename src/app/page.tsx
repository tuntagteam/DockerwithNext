import Image from "next/image";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";

const globalForMysql = global as unknown as { _pool?: mysql.Pool };
function getPool() {
  if (!globalForMysql._pool) {
    const host = process.env.DB_HOST || "localhost";
    const database = process.env.MYSQL_DATABASE || "appdb";
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "";
    const port = Number(process.env.DB_PORT) || 3306;
    globalForMysql._pool = mysql.createPool({
      host,
      user,
      password,
      database,
       port,
      connectionLimit: 10,
      waitForConnections: true,
      enableKeepAlive: true,
      charset: "utf8mb4_general_ci",
    });
    console.log("[mysql] pool created", { host, database });
  }
  return globalForMysql._pool!;
}

interface UserRow extends RowDataPacket {
  user_id: number;
  firstname: string;
  lastname: string;
  province_name: string | null;
}

interface ProvinceRow extends RowDataPacket {
  province_id: number;
  name: string;
}

async function getUsers(params?: { q?: string; provinceId?: number | null }): Promise<{ users: UserRow[]; error?: string }> {
  const pool = getPool();
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
  } catch (e: any) {
    console.error("[mysql] connection error", e);
    return { users: [], error: `Connection failed: ${e?.code || e?.message || "unknown error"}` };
  }
  try {
    const where: string[] = [];
    const values: any[] = [];
    if (params?.q) {
      where.push("(u.firstname LIKE ? OR u.lastname LIKE ?)");
      values.push(`%${params.q}%`, `%${params.q}%`);
    }
    if (params?.provinceId != null && !Number.isNaN(params.provinceId)) {
      where.push("u.province_id = ?");
      values.push(params.provinceId);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [rows] = await pool.query<UserRow[]>(
      `SELECT
          u.user_id, u.firstname, u.lastname,
          p.name AS province_name
        FROM tb_user u
        LEFT JOIN tb_province p ON p.province_id = u.province_id
        ${whereSql}
        ORDER BY u.user_id`,
      values
    );
    return { users: rows };
  } catch (e: any) {
    console.error("[mysql] query error", e);
    return { users: [], error: `Query failed: ${e?.code || e?.message || "unknown error"}` };
  }
}

async function getProvinces(): Promise<{ provinces: ProvinceRow[]; totalUsers: number; withProvince: number; }> {
  const pool = getPool();
  const [provinces] = await pool.query<ProvinceRow[]>("SELECT province_id, name FROM tb_province ORDER BY name");
  const [[{ totalUsers }]] = await pool.query<any[]>("SELECT COUNT(*) AS totalUsers FROM tb_user");
  const [[{ withProvince }]] = await pool.query<any[]>("SELECT COUNT(*) AS withProvince FROM tb_user WHERE province_id IS NOT NULL");
  return { provinces, totalUsers, withProvince };
}

export default async function Home(props: { searchParams: Promise<{ q?: string; province?: string }> }) {
  const searchParams = await props.searchParams;
  const q = (searchParams?.q || "").trim() || undefined;
  const provinceId = searchParams?.province ? Number(searchParams.province) : undefined;
  const { users, error } = await getUsers({ q, provinceId });
  const { provinces, totalUsers, withProvince } = await getProvinces();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold">MySQL Demo</span>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 text-red-800 px-4 py-3">
            <div className="font-medium">Database error</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        )}

        <section className="w-full">
          <form method="GET" className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <label htmlFor="q" className="block text-sm font-medium mb-1">Search name</label>
              <input
                id="q"
                name="q"
                defaultValue={q ?? ""}
                placeholder="e.g. Aom, Beam"
                className="w-full rounded-md border border-black/10 dark:border-white/15 px-3 py-2 outline-none focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30 bg-white dark:bg-zinc-900"
              />
            </div>
            <div className="sm:w-64">
              <label htmlFor="province" className="block text-sm font-medium mb-1">Province</label>
              <select
                id="province"
                name="province"
                defaultValue={provinceId ?? ""}
                className="w-full rounded-md border border-black/10 dark:border-white/15 px-3 py-2 bg-white dark:bg-zinc-900"
              >
                <option value="">All provinces</option>
                {provinces.map((p) => (
                  <option key={p.province_id} value={p.province_id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="h-[38px] sm:h-[38px] px-4 rounded-md border border-transparent bg-black text-white dark:bg-white dark:text-black hover:opacity-90">
                Apply
              </button>
              <a href="?" className="h-[38px] sm:h-[38px] px-4 rounded-md border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 flex items-center">
                Reset
              </a>
            </div>
          </form>
        </section>

        <section className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-black/10 dark:border-white/15 p-3">
              <div className="text-xs opacity-70">Total users</div>
              <div className="text-2xl font-semibold mt-0.5">{totalUsers}</div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/15 p-3">
              <div className="text-xs opacity-70">With province</div>
              <div className="text-2xl font-semibold mt-0.5">{withProvince}</div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/15 p-3">
              <div className="text-xs opacity-70">Showing</div>
              <div className="text-2xl font-semibold mt-0.5">{users.length}</div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="min-w-full text-sm">
              <thead className="bg-black/[.04] dark:bg-white/[.06] sticky top-0">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Firstname</th>
                  <th className="px-4 py-2 font-medium">Lastname</th>
                  <th className="px-4 py-2 font-medium">Province</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.user_id} className={idx % 2 ? "bg-black/[.015] dark:bg-white/[.03]" : ""}>
                    <td className="px-4 py-2 tabular-nums">{u.user_id}</td>
                    <td className="px-4 py-2">{u.firstname}</td>
                    <td className="px-4 py-2">{u.lastname}</td>
                    <td className="px-4 py-2">{u.province_name ?? <em className="opacity-70">Unknown</em>}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center opacity-70" colSpan={4}>
                      No data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="text-xs opacity-70">
          <p>
            Using <code>mysql2/promise</code> directly in a Server Component. Configure via environment variables:
            <code className="ml-1">DB_HOST</code>, <code>DB_USER</code>, <code>DB_PASSWORD</code>, <code>MYSQL_DATABASE</code>, <code>DB_PORT</code>.
          </p>
        </section>
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image aria-hidden src="/file.svg" alt="File icon" width={16} height={16} />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image aria-hidden src="/window.svg" alt="Window icon" width={16} height={16} />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image aria-hidden src="/globe.svg" alt="Globe icon" width={16} height={16} />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
