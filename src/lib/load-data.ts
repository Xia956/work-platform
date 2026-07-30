import { createClient } from "@/lib/supabase/server";

export async function loadRows<T>(
  table: string,
  orderColumn = "created_at",
  limit = 100,
): Promise<T[]> {
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
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select("*").in(column, ids);
  if (error) throw new Error(`读取 ${table} 关联数据失败`);
  return (data ?? []) as T[];
}
