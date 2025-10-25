export async function getSmartTip(profile: any, scores: any) {
  const res = await fetch("/api/smart-tip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile, scores }),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return (json.tip as string) || "No tip available.";
}