import { createClient } from "@/lib/supabase/server";
import { localPreviewBypass } from "@/lib/config";
import { localDemoRows } from "@/lib/demo-content";

export async function loadRows<T>(
  table: string,
  orderColumn = "created_at",
  limit = 100,
): Promise<T[]> {
  if (localPreviewBypass) {
    const rows = [...(localDemoRows[table] ?? [])] as Array<T & Record<string, unknown>>;
    return rows
      .sort((a, b) => +new Date(String(b[orderColumn] ?? 0)) - +new Date(String(a[orderColumn] ?? 0)))
      .slice(0, limit) as T[];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(orderColumn, { ascending: false })
    .limit(limit);
  if (error) throw new Error(`读取 ${table} 失败`);
  return (data ?? []) as T[];
}

export async function loadRelated<T>(
  table: string,
  column: string,
  ids: string[],
): Promise<T[]> {
  if (!ids.length) return [];
  if (localPreviewBypass) {
    return (localDemoRows[table] ?? []).filter((row) =>
      ids.includes(String((row as Record<string, unknown>)[column])),
    ) as T[];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select("*").in(column, ids);
  if (error) throw new Error(`读取 ${table} 关联数据失败`);
  return (data ?? []) as T[];
}
