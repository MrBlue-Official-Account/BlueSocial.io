// ================================
// script.js - Versión final
// ================================

// ---------------------------------------------------
// Función: Menús desplegables (sidebar)
// ---------------------------------------------------
function initDropdownMenus() {
    let listElements = document.querySelectorAll('.list__button--click');

    listElements.forEach(listElement => {
        listElement.addEventListener('click', (e) => {
            // NOTA: removimos e.stopPropagation() para permitir que el handler delegado
            // del sidebar capture clicks y marque el item como "active".

            // Cerrar otros menús abiertos
            listElements.forEach(otherElement => {
                if (otherElement !== listElement) {
                    otherElement.classList.remove('arrow');
                    let otherMenu = otherElement.nextElementSibling;
                    if (otherMenu && otherMenu.classList.contains('list__show')) {
                        otherMenu.style.height = '0px';
                    }
                }
            });

            // Alternar el menú actual
            listElement.classList.toggle('arrow');

            let height = 0;
            let menu = listElement.nextElementSibling;

            if (menu && menu.classList.contains('list__show')) {
                if (parseInt(menu.style.height) === 0 || !menu.style.height) {
                    height = menu.scrollHeight;
                }
                menu.style.height = `${height}px`;
            }
        });
    });
}


// ---------------------------------------------------
// Variables globales y helpers
// ---------------------------------------------------
let originalMainContent = "";
const copyNotification = document.querySelector('.copy-notification');

// Helper copia al portapapeles (con fallback)
function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
        if (copyNotification) {
            copyNotification.style.display = 'block';
            setTimeout(() => copyNotification.style.display = 'none', 2000);
        }
    }).catch(err => {
        console.error('Error al copiar: ', err);
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        document.body.removeChild(textArea);

        if (copyNotification) {
            copyNotification.style.display = 'block';
            setTimeout(() => copyNotification.style.display = 'none', 2000);
        }
    });
}


// ---------------------------------------------------
// Cargar páginas vía AJAX dentro de main-content
// ---------------------------------------------------
const mainContent = document.querySelector('.main-content');

function loadPage(url) {
    if (!mainContent) return;
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(html => {
            mainContent.innerHTML = html;

            // Scroll al inicio del main-content de cada web
            mainContent.scrollTop = 0;

            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Opcional: añade animación suave
            });
            // Si la página cargada incluye JS que necesita inicializarse,
            // puedes ejecutar funciones aquí (por ejemplo, tablas, charts, etc).
            // Para COPY y demás usamos delegation, así que no es necesario re-bindear.

            // Cerrar sidebar en móviles después de cargar
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.sidebar-overlay');
                sidebar?.classList.remove('active');
                overlay?.classList.remove('active');
            }
        })
        .catch(error => {
            mainContent.innerHTML = `<p style="color:red;">Error al cargar ${url}</p>`;
            console.error("Error cargando página:", error);
        });
}


// ---------------------------------------------------
// Inicialización principal tras DOMContentLoaded
// ---------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Guardar contenido original del main (para "Inicio")
    if (mainContent) originalMainContent = mainContent.innerHTML;

    // Inicializar dropdowns del sidebar
    initDropdownMenus();

    // ELEMENTOS recurrentes
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const menuToggle = document.querySelector('.menu-toggle');

    // Terminal
    const terminalToggle = document.querySelector('.terminal-toggle');
    const terminalContainer = document.querySelector('.terminal-container');
    const terminalClose = document.querySelector('.terminal-close');
    const terminalMinimize = document.querySelector('.terminal-minimize');
    const terminalMaximize = document.querySelector('.terminal-maximize');

    // ---------------------------------------------------
    // Menu toggle (móvil / desktop)
    // ---------------------------------------------------
    if (menuToggle) {
        menuToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!sidebar || !overlay) return;

            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            } else {
                sidebar.classList.toggle('minimized');
                // Si existe: actualización de tooltips
                if (typeof updateSidebarTooltips === 'function') updateSidebarTooltips();
            }
        });
    }

    // ---------------------------------------------------
    // Overlay click (cerrar menu móvil)
    // ---------------------------------------------------
    overlay?.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
            sidebar?.classList.remove('active');
            this.classList.remove('active');
        }
    });

    // ---------------------------------------------------
    // Terminal controls
    // ---------------------------------------------------
    terminalToggle?.addEventListener('click', function () {
        if (!terminalContainer) return;
        terminalContainer.style.display = terminalContainer.style.display === 'block' ? 'none' : 'block';
    });

    terminalClose?.addEventListener('click', function () {
        if (!terminalContainer) return;
        terminalContainer.style.display = 'none';
    });

    terminalMinimize?.addEventListener('click', function () {
        const terminalBody = document.querySelector('.terminal-body');
        if (!terminalBody) return;
        terminalBody.style.display = terminalBody.style.display === 'none' ? 'block' : 'none';
    });

    terminalMaximize?.addEventListener('click', function () {
        if (!terminalContainer) return;
        if (terminalContainer.style.width === '100%') {
            terminalContainer.style.width = '';
            terminalContainer.style.right = '';
        } else {
            terminalContainer.style.width = '100%';
            terminalContainer.style.right = '0';
        }
    });

    // ---------------------------------------------------
    // Delegación de eventos: COPY y terminal-copy
    // ---------------------------------------------------

    // Función para extraer texto del bloque de código
    function extractCodeFromBlock(codeBlock) {
        // Obtener texto del bloque de código
        let codeText = '';

        // Si es un bloque simple (solo texto)
        if (codeBlock.textContent) {
            codeText = codeBlock.textContent;
        }

        // Limpiar espacios extras
        codeText = codeText.trim();

        return codeText;
    }

    function handleCopyEvent(event) {
        // Para botones de copiar en bloques de código
        const copyBtn = event.target.closest?.('.code-copy-btn');
        if (copyBtn) {
            event.preventDefault();
            event.stopPropagation();

            // Intentar obtener el código del atributo data-code
            let cmd = copyBtn.getAttribute('data-code') || copyBtn.dataset.code;

            // Si no hay data-code, extraer del bloque de código
            if (!cmd || cmd.trim() === '') {
                const codeBlock = copyBtn.closest('.code-block-container')?.querySelector('.code-block');
                if (codeBlock) {
                    cmd = extractCodeFromBlock(codeBlock);
                }
            }

            copyToClipboard(cmd);
            return;
        }

        // Para botones de copiar en terminal
        const termCopy = event.target.closest?.('.terminal-copy');
        if (termCopy) {
            event.preventDefault();
            event.stopPropagation();

            const cmd = termCopy.getAttribute('data-command') || termCopy.dataset.command;
            copyToClipboard(cmd);
            return;
        }
    }

    // Agregar listeners para ambos eventos (click y touch)
    document.addEventListener('click', function (event) {
        // Solo procesar si es un botón de copiar
        if (event.target.closest?.('.code-copy-btn') || event.target.closest?.('.terminal-copy')) {
            handleCopyEvent(event);
        }
    }, { passive: false });

    // También mejora la función copyToClipboard para móviles
    function copyToClipboard(text) {
        if (!text) return;

        // Intentar usar la API moderna
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showCopyNotification();
            }).catch(err => {
                console.error('Error al copiar (API): ', err);
                fallbackCopy(text);
            });
        } else {
            // Fallback para navegadores más antiguos o contextos no seguros
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            showCopyNotification();
        } catch (e) {
            console.error('Error al copiar (fallback): ', e);
            // Mostrar un alert solo en desarrollo
            if (window.location.hostname === 'localhost') {
                alert('Error al copiar: ' + e);
            }
        }

        document.body.removeChild(textArea);
    }

    function showCopyNotification() {
        if (copyNotification) {
            copyNotification.style.display = 'block';
            copyNotification.style.opacity = '1';

            // Efecto de desvanecimiento
            setTimeout(() => {
                copyNotification.style.opacity = '0';
                setTimeout(() => {
                    copyNotification.style.display = 'none';
                }, 300);
            }, 1500);
        }
    }

    // ------------------------------------------------------------------
    // Delegación de eventos: Subdominios - CTFs/HTB/Strutted.html y otros
    // ------------------------------------------------------------------

    document.addEventListener("click", function (e) {
        const link = e.target.closest("a[data-load]");
        if (!link) return;

        e.preventDefault();
        loadPage(link.dataset.load);
    })

    // ---------------------------------------------------
    // Delegación de eventos: sidebar (active + navegación)
    // ---------------------------------------------------

    sidebar?.addEventListener('click', function (event) {
        // 1) Si clicaste en un <a>, lo marcamos como activo y evitamos default
        const anchor = event.target.closest?.('a');
        if (anchor && sidebar.contains(anchor)) {
            event.preventDefault();

            // Remover active de todos los enlaces del sidebar
            sidebar.querySelectorAll('a').forEach(a => a.classList.remove('active'));

            // Poner active en el actual
            anchor.classList.add('active');

            // !------------> Aqui van los enlaces de contenido interno (sublista) <------------
            if (anchor.classList.contains('nav__link--inside')) {
                const text = anchor.textContent.trim();
                // Mapea los textos a archivos (ajusta nombres si es necesario)
                if (text === 'Reconocimiento') loadPage('Directory/Pentesting/reconocimiento.html');
                //else if (text === 'Escaneo') loadPage('escaneo.html');
                //else if (text === 'Explotación') loadPage('explotacion.html');

                // Mapeos CTFs...
                else if (text === 'Write-ups') loadPage('CTFs/Write-ups.html');

                else loadPage('underconstruct/503.html');
                return;
            } else {
                // Si es "Inicio" (u otro enlace fuera de sublistas) restauramos main
                const text = anchor.textContent.trim();
                if (text === 'Inicio') {
                    if (mainContent) {
                        mainContent.innerHTML = originalMainContent;
                        // No necesitamos re-bind para COPY por delegación
                    }
                    // cerrar sidebar en movil
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('active');
                        overlay?.classList.remove('active');
                    }
                }
            }

            return;
        }

        // 2) Si clicaste directamente en el botón .list__button--click (div),
        //    dejamos que initDropdownMenus gestione el despliegue, y además
        //    marcamos el enlace interno (si existe) como active.
        const listBtn = event.target.closest?.('.list__button--click');
        if (listBtn && sidebar.contains(listBtn)) {
            // marcar el enlace interno dentro del botón como active
            const innerAnchor = listBtn.querySelector('a.nav__link');
            if (innerAnchor) {
                // remover active de todos y asignar
                sidebar.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                innerAnchor.classList.add('active');
            }
            // NOTA: no evitamos default aquí porque no es un <a> directo
        }
    });

    // ---------------------------------------------------
    // Cerrar sidebar cuando se hace click en enlaces (no-sublista) en móviles
    // ---------------------------------------------------
    // (esto evita cerrar cuando navegamos por sublistas)
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function (e) {
            // Si es sublink, no forzamos el cierre; el delegado decide
            if (this.classList.contains('nav__link--inside') || this.closest('.list__button--click')) {
                return;
            }
            // En móviles, cerrar el sidebar
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    sidebar.classList.remove('active');
                    overlay?.classList.remove('active');
                }, 300);
            }
        });
    });

}); // FIN DOMContentLoaded


// ---------------------------------------------------
// Cerrar terminal al hacer click fuera (global)
// ---------------------------------------------------
document.addEventListener('click', function (event) {
    const terminalContainer = document.querySelector('.terminal-container');
    const terminalToggle = document.querySelector('.terminal-toggle');
    if (!terminalContainer || !terminalToggle) return;

    if (!terminalContainer.contains(event.target) &&
        !terminalToggle.contains(event.target) &&
        terminalContainer.style.display === 'block') {
        terminalContainer.style.display = 'none';
    }
});


// ---------------------------------------------------
// Responsive: al cambiar tamaño restaurar estado sidebar
// ---------------------------------------------------
window.addEventListener('resize', function () {
    if (window.innerWidth > 768) {
        document.querySelector('.sidebar')?.classList.remove('active');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
});

// ============================
// Detectar modo oscuro del sistema
// ============================
function applySystemTheme() {
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)");

    function updateTheme(e) {
        if (e.matches) {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
    }

    // Aplicar tema apenas carga
    updateTheme(darkMode);

    // Detectar cambios en tiempo real
    darkMode.addEventListener("change", updateTheme);
}

// Ejecutar antes de todo
applySystemTheme();
