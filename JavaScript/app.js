// ========================================
// CONFIGURACIÓN INICIAL
// ========================================

// Variable global para almacenar los productos cargados
let productos = [];

// Número de WhatsApp (⚠️ CAMBIAR por el número real)
const numeroWhatsApp = "573209538728";

// ========================================
// FUNCIONES GOOGLE ANALYTICS (EVENTOS)
// ========================================

/**
 * Registrar clic en un producto (cuando alguien lo abre en el carrusel)
 * @param {Object} producto - Datos del producto
 */
function registrarClickProducto(producto) {
    if (typeof gtag !== "undefined") {
        gtag("event", "select_item", {
            items: [{
                item_id: producto.id,
                item_name: producto.nombre,
                price: producto.precio,
                item_category: producto.categoria
            }]
        });
    }
}

/**
 * Registrar clic en WhatsApp
 * @param {String} numero - Número de WhatsApp
 */
function registrarClickWhatsApp(numero) {
    if (typeof gtag !== "undefined") {
        gtag("event", "click_whatsapp", {
            event_category: "engagement",
            event_label: numero,
            value: 1
        });
    }
}

/**
 * Registrar intención de compra (cuando alguien hace clic en "Pedir por WhatsApp")
 * @param {Object} producto - Datos del producto
 * @param {String} numero - Número de WhatsApp usado
 */
function registrarCompra(producto, numero) {
    if (typeof gtag !== "undefined") {
        gtag("event", "purchase", {
            transaction_id: Date.now(),   // ID único para GA
            affiliation: "E-commerce Amor y Amistad",
            value: producto.precio,
            currency: "COP",
            items: [{
                item_id: producto.id,
                item_name: producto.nombre,
                price: producto.precio,
                item_category: producto.categoria
            }],
            contact_number: numero // campo extra (no estándar, pero útil)
        });
    }
}

// ========================================
// FUNCIONES PARA CARGAR DATOS
// ========================================

async function cargarProductos() {
    try {
        const response = await fetch('./DB/productos.json');
        if (!response.ok) throw new Error('Error al cargar productos');

        productos = await response.json();
        mostrarProductos();

        await esperarImagenesCargadas();

        document.getElementById("loader").style.display = "none";
        document.getElementById("products-container").style.display = "grid";

    } catch (error) {
        console.error('Error:', error);
        const container = document.getElementById('products-container');
        container.innerHTML = `
            <p>Error cargando productos. 
            Verifica que el archivo <b>productos.json</b> exista en la carpeta DB.</p>
        `;
    }
}

// FUNCIONES DE VISUALIZACIÓN
// ========================================

function mostrarProductos(productosAMostrar = productos) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    productosAMostrar.forEach(producto => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        // ✅ VERIFICAR SI TIENE ACCESORIOS
        let accesoriosHTML = '';
        if (producto.accesorios && producto.accesorios.length > 0) {
            accesoriosHTML = `
                <div class="product-accessories">
                    <label>Accesorios:</label>
                    <select id="accesorio-${producto.id}">
                        <option value="">-- Seleccionar --</option>
                        ${producto.accesorios.map(acc => `<option value="${acc}">${acc}</option>`).join('')}
                    </select>
                    <input type="text" id="mensaje-${producto.id}" placeholder="Escribe un mensaje personalizado (opcional)" style="margin-top:5px;">
                </div>
            `;
        } else {
            // ✅ MOSTRAR SOLO EL INPUT DE MENSAJE SI NO HAY ACCESORIOS
            accesoriosHTML = `
                <div class="product-accessories">
                    <input type="text" id="mensaje-${producto.id}" placeholder="Escribe un mensaje personalizado (opcional)" style="margin-top:5px;">
                </div>
            `;
        }

        productCard.innerHTML = `
            <div class="product-image" onclick="abrirCarrusel(${producto.id})" style="cursor: pointer;">
                <img src="${producto.imagen}" alt="${producto.nombre}">
            </div>

            <div class="product-info">
                <h3 class="product-title">${producto.nombre}</h3>
                <p class="product-description">${producto.descripcion}</p>
                ${accesoriosHTML}
                <div class="product-price">$${producto.precio.toLocaleString()}</div>

                <button class="whatsapp-btn" onclick="enviarWhatsApp(${producto.id})">
                    <i class="fab fa-whatsapp whatsapp-icon"></i>
                    Pedir por WhatsApp
                </button>
            </div>
        `;

        container.appendChild(productCard);
    });
}

// ========================================
// FUNCIONES DE WHATSAPP
// ========================================

function enviarWhatsApp(productoId) {
    const producto = productos.find(p => p.id === productoId);

    // ✅ VERIFICAR SI EXISTE EL SELECTOR DE ACCESORIOS
    const selectorAccesorio = document.getElementById(`accesorio-${productoId}`);
    let accesorio = "";
    if (selectorAccesorio) {
        accesorio = selectorAccesorio.value;
    }

    const mensajePersonalizado = document.getElementById(`mensaje-${productoId}`).value.trim();

    let extras = "🎀 Incluye moño decorativo";
    if (accesorio) extras += ` + ${accesorio}`;
    if (mensajePersonalizado) extras += ` + Mensaje: "${mensajePersonalizado}"`;

    const mensaje = `¡Hola! 😊 Me interesa el siguiente producto de su catálogo:

📦 *${producto.nombre}*
💰 Precio: $${producto.precio.toLocaleString()}

${producto.descripcion}

✨ Opciones seleccionadas: ${extras}

¿Está disponible?
¿Cuáles son las formas de pago y entrega?

¡Gracias! 💕`;

    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');

    // 🔹 Eventos GA4
    registrarClickWhatsApp(numeroWhatsApp);
    registrarCompra(producto, numeroWhatsApp);
}

// ========================================
// FUNCIONES DE GALERÍA / CARRUSEL
// ========================================

let galeria = [];
let imagenActual = 0;
let imagenesProducto = [];

async function cargarGaleria() {
    try {
        const response = await fetch('./DB/galeria.json');
        galeria = await response.json();
    } catch (error) {
        console.error("Error cargando galeria:", error);
    }
}

function abrirCarrusel(productoId) {
    const galeriaProducto = galeria.find(g => g.id === productoId);
    const producto = productos.find(p => p.id === productoId);

    if (galeriaProducto && galeriaProducto.imagenes.length > 1) {
        imagenesProducto = galeriaProducto.imagenes;
        imagenActual = 0;
        document.getElementById("carrusel-img").src = imagenesProducto[imagenActual];
        document.querySelector(".prev").style.display = "block";
        document.querySelector(".next").style.display = "block";
    } else {
        imagenesProducto = [producto.imagen];
        imagenActual = 0;
        document.getElementById("carrusel-img").src = producto.imagen;
        document.querySelector(".prev").style.display = "none";
        document.querySelector(".next").style.display = "none";
    }

    // 🔹 Evento GA4: clic en producto
    registrarClickProducto(producto);

    document.getElementById("modal-carrusel").style.display = "flex";
}

function cambiarImagen(direccion) {
    imagenActual = (imagenActual + direccion + imagenesProducto.length) % imagenesProducto.length;
    document.getElementById("carrusel-img").src = imagenesProducto[imagenActual];
}

document.querySelector(".cerrar").addEventListener("click", () => {
    document.getElementById("modal-carrusel").style.display = "none";
});
document.querySelector(".prev").addEventListener("click", () => cambiarImagen(-1));
document.querySelector(".next").addEventListener("click", () => cambiarImagen(1));
window.addEventListener("click", (e) => {
    if (e.target.id === "modal-carrusel") {
        document.getElementById("modal-carrusel").style.display = "none";
    }
});

// ========================================
// LOADER
// ========================================

function esperarImagenesCargadas() {
    return new Promise((resolve) => {
        const container = document.getElementById("products-container");
        const imagenes = container.querySelectorAll("img");

        let cargadas = 0;
        const total = imagenes.length;

        if (total === 0) resolve();

        imagenes.forEach(img => {
            if (img.complete) {
                cargadas++;
                if (cargadas === total) resolve();
            } else {
                img.addEventListener("load", () => {
                    cargadas++;
                    if (cargadas === total) resolve();
                });
                img.addEventListener("error", () => {
                    cargadas++;
                    if (cargadas === total) resolve();
                });
            }
        });
    });
}
// ========================================
// FUNCIONES DE FILTRADO Y NAVEGACIÓN
// ========================================

function filtrarProductos(categoria) {
    // Actualizar botones activos
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    let productosFiltrados;

    if (categoria === 'todos') {
        productosFiltrados = productos;
    } else {
        productosFiltrados = productos.filter(producto => producto.categoria === categoria);
    }

    // Mostrar productos filtrados
    mostrarProductos(productosFiltrados);

    // Mostrar mensaje si no hay productos
    const container = document.getElementById('products-container');
    if (productosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <p>No hay productos en esta categoría por el momento.</p>
                <p>¡Pronto tendremos novedades!</p>
            </div>
        `;
    }

    // 🔹 Evento GA4: filtro aplicado
    if (typeof gtag !== "undefined") {
        gtag("event", "filter_products", {
            event_category: "engagement",
            event_label: categoria,
            value: productosFiltrados.length
        });
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    cargarGaleria();
    cargarProductos();

    // Asegurar que el botón "Todos" esté activo al inicio
    document.querySelector('.nav-btn').classList.add('active');
});