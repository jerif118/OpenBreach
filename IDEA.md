## Idea

En América Latina, los ataques de ransomware han crecido muchísimo recientemente. Por ejemplo, a mediados del año pasado se filtraron datos de 7.4 millones de ciudadanos paraguayos _(básicamente todo el país)_ después de que el gobierno no pagó la extorsión.

Los blancos más débiles, hasta donde entiendo, son los gobiernos municipales. Hay muchísimos municipios en la región, la mayoría con sitios web que manejan datos de ciudadanos, trámites, pagos, registros civiles. Casi ninguno tiene personal dedicado a ciberseguridad.

Muchos de estos sitios corren versiones viejas de WordPress o Joomla, con paneles de administración expuestos o certificados vencidos. No hace falta ser muy sofisticado para meterse.

La idea es que implementemos agentes que descubran sitios web municipales automáticamente usando registros públicos, miran lo que cualquier navegador puede ver: versión del servidor, del CMS, estado del certificado, etc., y cruzan eso con bases de datos de vulnerabilidades conocidas.

Con eso se genera un reporte de remediación con pasos concretos para que un técnico municipal pueda arreglarlo. No es necesario explotar nada, solo usar información pública.

Para el MVP podemos enfocarnos en México, analizamos los 500 más grandes y armamos un mapa interactivo con nivel de riesgo por municipio. Si además generamos PDFs con instrucciones de remediación para los 10 más expuestos, eso ya es algo entregable en mi opinión.

## Tech stack

- https://github.com/aws/bedrock-agentcore-sdk-typescript

- https://tanstack.com/start/latest

We want to keep TypeScript on the client, and on the server side, we can still use TypeScript or have parts of the agent in Python.
