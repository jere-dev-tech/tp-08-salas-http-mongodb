const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter, once } = require("node:events");
const { setImmediate: siguienteTurno } = require("node:timers/promises");
const { spawnSync } = require("node:child_process");
const mongoose = require("mongoose");
const Reserva = require("../src/modelos/reserva");
const { crearApp } = require("../src/app");
const { crearServicioReservas } = require("../src/servicios/reservas");
const { iniciarServidor } = require("../src/index");

const datos = {
  estudiante: "Ana Ejemplo",
  email: "ana@example.invalid",
  sala: "Sala Norte",
  fecha: "2026-10-21",
  turno: "Mañana",
  personas: 2,
};

let conectarOriginal;
let intentosConexion = 0;
before(() => {
  conectarOriginal = mongoose.connect;
  mongoose.connect = () => {
    intentosConexion++;
    throw new Error("Las pruebas locales prohíben conexiones reales.");
  };
});
after(() => {
  mongoose.connect = conectarOriginal;
  assert.equal(intentosConexion, 0);
  assert.equal(mongoose.connection.readyState, 0);
});

function diferida() {
  let resolver;
  const promesa = new Promise((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}

// Doble de las operaciones de Mongoose: valida documentos, pero nunca guarda.
function crearModeloSimulado() {
  const documentos = [];
  return {
    documentos,
    criterios: [],
    antesDeCrear: async () => {},
    async find(criterio) {
      this.criterios.push(criterio);
      return documentos.filter(
        (doc) => criterio.sala === undefined || doc.sala === criterio.sala,
      );
    },
    async findById(id) {
      return documentos.find((doc) => doc.id === id.toLowerCase()) ?? null;
    },
    async countDocuments(criterio) {
      assert.deepEqual(criterio, {});
      return documentos.length;
    },
    async create(entrada) {
      assert.deepEqual(Object.keys(entrada).sort(), Object.keys(datos).sort());
      await this.antesDeCrear();
      const documento = new Reserva(entrada);
      await documento.validate();
      documentos.push(documento);
      return documento;
    },
  };
}

async function clienteLocal(t, servicio) {
  t.mock.method(console, "log", () => {});
  const app = crearApp(servicio, { formatoMorgan: () => undefined });
  app.set("env", "test");
  const servidor = app.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  t.after(async () => {
    servidor.closeAllConnections();
    await new Promise((resolve) => servidor.close(resolve));
  });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return async (metodo, ruta, cuerpo, tipo = "application/json") => {
    const opciones = { method: metodo, redirect: "manual" };
    if (cuerpo !== undefined) {
      opciones.headers = { "Content-Type": tipo };
      opciones.body =
        typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo);
    }
    const respuesta = await fetch(base + ruta, opciones);
    const texto = await respuesta.text();
    const json = respuesta.headers
      .get("content-type")
      ?.includes("application/json");
    return {
      estado: respuesta.status,
      headers: respuesta.headers,
      texto,
      cuerpo: json ? JSON.parse(texto) : null,
    };
  };
}

test("Modelo: defaults, enums y tipos estrictos sin conexión", async (t) => {
  const documento = new Reserva({ ...datos, estudiante: " Ana Ejemplo " });
  await documento.validate();
  assert.equal(documento.estudiante, datos.estudiante);
  assert.equal(documento.estado, "pendiente");
  assert.equal(Reserva.collection.collectionName, "reservas");
  assert.equal(Reserva.schema.options.autoCreate, false);
  assert.equal(Reserva.schema.options.autoIndex, false);
  await new Reserva({ ...datos, estado: "confirmada" }).validate();
  await assert.rejects(new Reserva({ ...datos, estado: "otro" }).validate());
  for (const campo of ["estudiante", "email", "sala", "fecha", "turno"]) {
    for (const valor of ["", "   ", 2, true, [], {}, null]) {
      await t.test(`${campo} rechaza ${JSON.stringify(valor)}`, async () => {
        await assert.rejects(
          new Reserva({ ...datos, [campo]: valor }).validate(),
        );
      });
    }
  }
  for (const valor of [
    0,
    7,
    2.5,
    "abc",
    "2",
    true,
    [2],
    {},
    { _id: 2 },
    null,
    NaN,
    Infinity,
  ]) {
    await t.test(`personas rechaza ${String(valor)}`, async () => {
      await assert.rejects(
        new Reserva({ ...datos, personas: valor }).validate(),
      );
    });
  }
});

test("API y HTML comparten operaciones async; rechazos sin altas", async (t) => {
  const modelo = crearModeloSimulado();
  const servicio = crearServicioReservas(modelo);
  const pedir = await clienteLocal(t, servicio);
  assert.deepEqual((await pedir("GET", "/api/reservas")).cuerpo, []);
  assert.equal(modelo.documentos.length, 0);

  await t.test("201 y Location esperan a que termine la creación", async () => {
    const entradaCreacion = diferida();
    const permitirCreacion = diferida();
    modelo.antesDeCrear = async () => {
      entradaCreacion.resolver();
      await permitirCreacion.promesa;
    };
    let respondio = false;
    const pendiente = pedir("POST", "/api/reservas", {
      ...datos,
      _id: "000000000000000000000000",
      estado: "confirmada",
    }).then((r) => {
      respondio = true;
      return r;
    });
    await entradaCreacion.promesa;
    await siguienteTurno();
    assert.equal(respondio, false);
    assert.equal(modelo.documentos.length, 0);
    permitirCreacion.resolver();
    const alta = await pendiente;
    modelo.antesDeCrear = async () => {};
    assert.equal(alta.estado, 201);
    assert.match(alta.cuerpo.id, /^[a-f\d]{24}$/);
    assert.notEqual(alta.cuerpo.id, "000000000000000000000000");
    assert.deepEqual(alta.cuerpo, {
      id: alta.cuerpo.id,
      ...datos,
      estado: "pendiente",
    });
    assert.equal(
      alta.headers.get("location"),
      `/api/reservas/${alta.cuerpo.id}`,
    );
    const consulta = await pedir("GET", alta.headers.get("location"));
    assert.equal(consulta.estado, 200);
    assert.deepEqual(consulta.cuerpo, alta.cuerpo);
  });

  const id = modelo.documentos[0].id;
  for (const [ruta, estado] of [
    ["/api/reservas/1", 400],
    ["/api/reservas/000000000000000000000000", 404],
    ["/api/reservas/%E0%A4%A", 400],
    ["/api/reservas?sala=Sala%20Norte&sala=Sala%20Sur", 400],
    ["/api/reservas?sala[$ne]=Sala%20Norte", 400],
    ["/api/desconocida", 404],
    ["/api/reservas/extra/ruta", 404],
    ["/api", 404],
  ]) {
    await t.test(ruta, async () => {
      const r = await pedir("GET", ruta);
      assert.equal(r.estado, estado);
      assert.equal(typeof r.cuerpo.error, "string");
    });
  }
  assert.equal(
    (await pedir("GET", "/api/reservas?sala=Sala%20Norte")).cuerpo.length,
    1,
  );
  assert.deepEqual(modelo.criterios.at(-1), { sala: "Sala Norte" });
  for (const sala of ["Sala Este", "sala norte", ""]) {
    const r = await pedir(
      "GET",
      `/api/reservas?sala=${encodeURIComponent(sala)}`,
    );
    assert.equal(r.estado, 200);
    assert.deepEqual(r.cuerpo, []);
  }

  const invalidos = [
    ["estudiante vacío", { ...datos, estudiante: " " }],
    ["email sin arroba", { ...datos, email: "correo" }],
    ["sala inválida", { ...datos, sala: "Sala Este" }],
    ["turno inválido", { ...datos, turno: "Madrugada" }],
    ["fecha vacía", { ...datos, fecha: "" }],
    ["objeto vacío", {}],
    ["cuerpo arreglo", []],
    ["cuerpo null", "null"],
    ["JSON incorrecto", "{"],
  ];
  for (const campo of ["estudiante", "email", "sala", "fecha", "turno"]) {
    for (const valor of [2, true, [], {}])
      invalidos.push([
        `${campo}: ${JSON.stringify(valor)}`,
        { ...datos, [campo]: valor },
      ]);
    invalidos.push([`${campo} ausente`, { ...datos, [campo]: undefined }]);
  }
  for (const valor of [
    0,
    7,
    2.5,
    "abc",
    "2",
    true,
    [2],
    {},
    { _id: 2 },
    null,
  ]) {
    invalidos.push([
      `personas: ${JSON.stringify(valor)}`,
      { ...datos, personas: valor },
    ]);
  }
  for (const [nombre, cuerpo] of invalidos) {
    await t.test(nombre, async () => {
      const antes = await servicio.contar();
      const r = await pedir("POST", "/api/reservas", cuerpo);
      assert.equal(r.estado, 400);
      assert.equal(typeof r.cuerpo.error, "string");
      assert.equal(r.headers.get("location"), null);
      assert.equal(await servicio.contar(), antes);
    });
  }
  for (const [cuerpo, tipo] of [
    [undefined, "application/json"],
    [JSON.stringify(datos), "text/plain"],
  ]) {
    const r = await pedir("POST", "/api/reservas", cuerpo, tipo);
    assert.equal(r.estado, 400);
    assert.equal(typeof r.cuerpo.error, "string");
    assert.equal(await servicio.contar(), 1);
  }

  await t.test(
    "HTML conserva vistas, valores, redirección y conteos",
    async () => {
      for (const ruta of [
        "/",
        "/reservas",
        "/reservas/nueva",
        `/reservas/${id}`,
        "/css/estilos.css",
      ]) {
        assert.equal((await pedir("GET", ruta)).estado, 200);
      }
      const lista = await pedir("GET", "/reservas");
      assert.ok(lista.texto.includes(`/reservas/${id}`));
      const invalido = await pedir(
        "POST",
        "/reservas",
        new URLSearchParams({ ...datos, email: "sin-arroba" }).toString(),
        "application/x-www-form-urlencoded",
      );
      assert.equal(invalido.estado, 400);
      assert.ok(invalido.texto.includes('value="Ana Ejemplo"'));
      assert.ok(invalido.texto.includes('value="sin-arroba"'));
      assert.equal(await servicio.contar(), 1);
      const valido = await pedir(
        "POST",
        "/reservas",
        new URLSearchParams(datos).toString(),
        "application/x-www-form-urlencoded",
      );
      assert.equal(valido.estado, 302);
      assert.equal(valido.headers.get("location"), "/reservas");
      const estado = await pedir("GET", "/estado");
      assert.equal(estado.estado, 200);
      assert.equal(estado.cuerpo.servicio, "activo");
      assert.equal(estado.cuerpo.reservas, 2);
      assert.match(estado.cuerpo.solicitudId, /^BIB-\d+$/);
      assert.equal((await pedir("GET", "/api/reservas")).cuerpo.length, 2);
      assert.equal((await pedir("GET", "/api/reservas")).cuerpo.length, 2);
      assert.equal(
        (await pedir("GET", "/reservas/000000000000000000000000")).estado,
        404,
      );
      assert.equal((await pedir("GET", "/inexistente")).estado, 404);
    },
  );
});

test("Errores de operación: 400/500 seguros, sin falsear éxitos", async (t) => {
  const modelo = crearModeloSimulado();
  const pedir = await clienteLocal(t, crearServicioReservas(modelo));
  const logs = t.mock.method(console, "error", () => {});
  const secretoFicticio = "SECRETO_FICTICIO_NO_PUBLICAR";
  const fallo = new Error(secretoFicticio);
  modelo.find = async () => {
    throw fallo;
  };
  modelo.countDocuments = async () => {
    throw fallo;
  };
  modelo.create = async () => {
    throw fallo;
  };
  for (const [metodo, ruta, cuerpo] of [
    ["GET", "/api/reservas"],
    ["POST", "/api/reservas", datos],
    ["GET", "/reservas"],
    ["GET", "/estado"],
  ]) {
    const r = await pedir(metodo, ruta, cuerpo);
    assert.equal(r.estado, 500);
    assert.ok(!r.texto.includes(secretoFicticio));
    assert.ok(!r.texto.includes("Error:"));
    if (ruta === "/reservas") assert.ok(r.texto.includes("Error 500"));
    if (ruta.startsWith("/api/")) assert.equal(typeof r.cuerpo.error, "string");
    assert.equal(r.headers.get("location"), null);
  }
  assert.ok(logs.mock.calls.length >= 4);
  assert.ok(
    logs.mock.calls.every(
      (call) => !call.arguments.join(" ").includes(secretoFicticio),
    ),
  );
  modelo.create = async () => {
    const documento = new Reserva({ ...datos, personas: true });
    await documento.validate();
  };
  assert.equal((await pedir("POST", "/api/reservas", datos)).estado, 400);
  const formulario = await pedir(
    "POST",
    "/reservas",
    new URLSearchParams(datos).toString(),
    "application/x-www-form-urlencoded",
  );
  assert.equal(formulario.estado, 400);
  assert.ok(formulario.texto.includes('value="Ana Ejemplo"'));
  assert.equal(modelo.documentos.length, 0);
});

test("Servicio descarta campos extra aun al llamarlo sin HTTP", async () => {
  const modelo = crearModeloSimulado();
  const recurso = await crearServicioReservas(modelo).crear({
    ...datos,
    _id: "000000000000000000000000",
    estado: "confirmada",
    extra: true,
  });
  assert.equal(recurso.estado, "pendiente");
  assert.notEqual(recurso.id, "000000000000000000000000");
});

function servidorSimulado(eventos) {
  const servidor = new EventEmitter();
  servidor.close = (callback) => {
    eventos.push("cierre-http");
    setImmediate(() => {
      eventos.push("http-cerrado");
      callback();
    });
  };
  return servidor;
}

test("Arranque espera conexión y cierra HTTP antes de MongoDB", async (t) => {
  t.mock.method(console, "log", () => {});
  const eventos = [];
  const conexion = diferida();
  const servidor = servidorSimulado(eventos);
  const senalesPrevias = new Set(process.listeners("SIGINT"));
  const pendiente = iniciarServidor({
    conectar: async () => {
      eventos.push("conectando");
      await conexion.promesa;
      eventos.push("conectado");
    },
    cerrar: async () => {
      eventos.push("mongo-cerrado");
    },
    crearAplicacion: () => ({
      listen: () => {
        eventos.push("escucha");
        process.nextTick(() => servidor.emit("listening"));
        return servidor;
      },
    }),
  });
  await siguienteTurno();
  assert.deepEqual(eventos, ["conectando"]);
  conexion.resolver();
  const iniciado = await pendiente;
  assert.deepEqual(eventos, ["conectando", "conectado", "escucha"]);
  t.after(() => iniciado.cerrarServidor());
  const cerrar1 = iniciado.cerrarServidor();
  assert.equal(cerrar1, iniciado.cerrarServidor());
  await cerrar1;
  assert.deepEqual(eventos.slice(-3), [
    "cierre-http",
    "http-cerrado",
    "mongo-cerrado",
  ]);
  assert.deepEqual(new Set(process.listeners("SIGINT")), senalesPrevias);
});

for (const senal of ["SIGINT", "SIGTERM"]) {
  test(`${senal} activa un cierre único`, async (t) => {
    t.mock.method(console, "log", () => {});
    const eventos = [];
    const servidor = servidorSimulado(eventos);
    const anteriores = new Set(process.listeners(senal));
    const iniciado = await iniciarServidor({
      conectar: async () => {},
      cerrar: async () => {
        eventos.push("mongo-cerrado");
      },
      crearAplicacion: () => ({
        listen: () => {
          process.nextTick(() => servidor.emit("listening"));
          return servidor;
        },
      }),
    });
    t.after(() => iniciado.cerrarServidor());
    const manejador = process
      .listeners(senal)
      .find((fn) => !anteriores.has(fn));
    assert.equal(typeof manejador, "function");
    manejador();
    manejador();
    await iniciado.cerrarServidor();
    assert.deepEqual(eventos, ["cierre-http", "http-cerrado", "mongo-cerrado"]);
  });
}

test("Fallo de conexión o de listen no anuncia disponibilidad y libera recursos", async (t) => {
  const logs = t.mock.method(console, "log", () => {});
  for (const fallaConexion of [true, false]) {
    let cierres = 0;
    let creacionesApp = 0;
    await assert.rejects(
      iniciarServidor({
        conectar: async () => {
          if (fallaConexion) throw new Error("fallo simulado");
        },
        cerrar: async () => {
          cierres++;
        },
        crearAplicacion: () => {
          creacionesApp++;
          return {
            listen: () => {
              throw new Error("puerto no disponible");
            },
          };
        },
      }),
    );
    assert.equal(cierres, 1);
    assert.equal(creacionesApp, fallaConexion ? 0 : 1);
  }
  assert.equal(logs.mock.calls.length, 0);
});

test("URI ausente: proceso real falla antes de abrir HTTP, sin red", () => {
  const resultado = spawnSync(process.execPath, ["src/index.js"], {
    cwd: require("node:path").join(__dirname, ".."),
    env: { PORT: "3000", NODE_ENV: "test", MONGODB_URI: "" },
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(resultado.status, 1);
  assert.ok(!resultado.stdout.includes("Servidor disponible"));
  assert.match(resultado.stderr, /MONGODB_URI/);
});
