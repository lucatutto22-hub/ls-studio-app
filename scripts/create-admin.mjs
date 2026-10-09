// Crée le premier compte administrateur.
// Usage : node --env-file=.env.local scripts/create-admin.mjs luca@exemple.fr "Luca"
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const [email, fullName = ""] = process.argv.slice(2);
if (!email) {
  console.error('Usage : node --env-file=.env.local scripts/create-admin.mjs email@exemple.fr "Prénom"');
  process.exit(1);
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const password = randomBytes(12).toString("base64url");
const { error } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  password,
  email_confirm: true,
  app_metadata: { role: "admin" },
  user_metadata: { full_name: fullName },
});
if (error) {
  console.error("Échec :", error.message);
  process.exit(1);
}
console.log(`Administrateur créé : ${email}\nMot de passe provisoire : ${password}\nChangez-le après la première connexion.`);
