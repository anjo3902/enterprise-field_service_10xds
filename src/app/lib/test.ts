import { supabase } from "./supabase";

export async function testConnection() {
  const { data, error } = await supabase
    .from("assets")
    .select("*");

  console.log("DATA:", data);

  if (error) {
    console.log("ERROR CODE:", error.code);
    console.log("ERROR MESSAGE:", error.message);
    console.log("FULL ERROR:", error);
  }
}