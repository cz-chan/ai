// Uso: npm run review <ruta-del-archivo>
// Ejemplo: npm run review ./src/config.ts

// Extensiones de archivo que soportamos
const SUPPORTED_FILE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go",
  ".rs", ".java", ".cs", ".cpp", ".c", ".rb",
  ".php", ".swift", ".kt", ".sql",
]);
// Límite de tamaño: archivos muy grandes consumen muchos tokens
const MAX_CHARS = 20_000;


// Mostrar header
  console.log("╔════════════════════════════════════════╗");
  console.log("║       DevAssistant — Code Reviewer     ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`\n📄 Archivo: ${}`);
  console.log(`   Ruta: ${}`);
  console.log(`   Líneas: ${} | Caracteres: ${}`);
  if (sizeWarning) console.log(sizeWarning);
  console.log("\nAnalizando con Claude...\n");
  console.log("─".repeat(60));

  // Construir el prompt con el contexto del archivo
  const prompt = `Por favor, revisa el siguiente archivo de código:
**Archivo:** \`${}\`
**Extensión:** ${ || "desconocida"}
**Líneas:** ${}
\`\`\`${extension.slice(1)}
${contenidoARevisar}
\`\`\``;