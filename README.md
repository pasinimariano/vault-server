Servidor de Hashicorp Vault.

Se utilizó docker-compose para generar la implementación y configuración del Servidor Vault. Esto se encuentra
en el root del directorio.

Para darle más seguridad al servidor se decidió implemantar un servidor de Two-Factor Authentication, el cual
consta de:
  -Client -> realizado con React y TS.
  -Server -> realizado con SvelteKit (será migrado a python en un futuro).

Existe un tercer servicio, que es el que se encargará de hacer el Unseal del Servidor Vault, sin este último el
servidor estará siempre bloqueado. Igualmente, por el momento, el docker es el encargado de realizar el Unseal.

Para poder utilizar todos los servicios, se debe hacer un npm i, en los 3 servidores (login , login-api , unseal)
y luego hacer un npm start de login, y login-api.
Una vez realizado los pasos anteriores, desde el directorio root, docker-compose up -d, esto último inicializará
el servidor Vault de manera local.
