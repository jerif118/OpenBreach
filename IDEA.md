## Idea

En América Latina, los ataques de ransomware han crecido muchísimo recientemente. Por ejemplo, a mediados del año pasado se filtraron datos de 7.4 millones de ciudadanos paraguayos _(básicamente todo el país)_ después de que el gobierno no pagó la extorsión.

Los blancos más débiles, hasta donde entiendo, son los gobiernos municipales. Hay muchísimos municipios en la región, la mayoría con sitios web que manejan datos de ciudadanos, trámites, pagos, registros civiles. Casi ninguno tiene personal dedicado a ciberseguridad.

Muchos de estos sitios corren versiones viejas de WordPress o Joomla, con paneles de administración expuestos o certificados vencidos. No hace falta ser muy sofisticado para meterse.

La idea es que implementemos agentes que descubran sitios web municipales automáticamente usando registros públicos, miran lo que cualquier navegador puede ver: versión del servidor, del CMS, estado del certificado, etc., y cruzan eso con bases de datos de vulnerabilidades conocidas.

Con eso se genera un reporte de remediación con pasos concretos para que un técnico municipal pueda arreglarlo. No es necesario explotar nada, solo usar información pública.

Para el MVP podemos enfocarnos en México, analizamos los 500 más grandes y armamos un mapa interactivo con nivel de riesgo por municipio. Si además generamos PDFs con instrucciones de remediación para los 10 más expuestos, eso ya es algo entregable en mi opinión.

## Tech stack

- https://tanstack.com/start/latest

- https://github.com/mastra-ai/mastra

- https://tanstack.com/ai/latest

- https://www.convex.dev/

- https://clerk.com/

- Reference pattern: https://github.com/ataschz/tanstack-start-mastra-example

We want to keep TypeScript across the client, server, data layer, auth boundary, and agent workflow. Convex should provide the database, backend functions, and real-time synchronization so the map, detail pages, scan status, scores, and report metadata can update without custom polling. Clerk should provide authentication and authorization, with Convex configured to trust Clerk-issued auth for protected mutations and operator/admin workflows. The app should be deployable to platform-agnostic hosting such as Vercel or Netlify, so the agent runtime should not depend on AWS-specific services. Python can be added later only if a specific passive scanning library clearly justifies it.
