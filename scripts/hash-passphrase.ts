import bcrypt from "bcryptjs";
const pw = process.argv[2];
if (!pw) {
  console.error("usage: tsx scripts/hash-passphrase.ts <passphrase>");
  process.exit(1);
}
console.log(bcrypt.hashSync(pw, 10));
