function loadSidebar(currentPage) {
    const sidebar = document.getElementById("sidebar");

    sidebar.innerHTML = `
        <aside class="sidebar">
            <nav class="sidebar-nav">

                <button
                    class="sidebar-button ${currentPage === "home" ? "active" : ""}"
                    id="homeButton"
                    onclick="window.location.href='index.html'">
                    🏠
                    <span>Home</span>
                </button>

                <button
                    class="sidebar-button ${currentPage === "dataInput" ? "active" : ""}"
                    id="dataInputButton"
                    onclick="window.location.href='dataInput.html'">
                    📥
                    <span>Data Input</span>
                </button>

            </nav>
        </aside>
    `;
}