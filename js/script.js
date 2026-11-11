import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = "https://elmoqkiygbvnaeuqalhj.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_Hz55NcklX3fjKNK2xuOwmA_1UXcdk7w";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  // ==========================================
  // ELEMENTOS DAS TELAS
  // ==========================================

  const loginScreen = document.getElementById("loginScreen");
  const registerScreen = document.getElementById("registerScreen");

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  const loginError = document.getElementById("loginError");
  const app = document.querySelector(".app");

  const showRegisterButton = document.getElementById("showRegister");
  const backToLoginButton = document.getElementById("backToLogin");

  // ABRIR TELA DE CADASTRO

  showRegisterButton.addEventListener("click", (event) => {
    event.preventDefault();

    loginScreen.style.display = "none";

    registerScreen.style.display = "flex";

    registerForm.reset();

    document.getElementById("registerError").textContent = "";
  });

  // VOLTAR PARA LOGIN

  backToLoginButton.addEventListener("click", (event) => {
    event.preventDefault();

    registerScreen.style.display = "none";

    loginScreen.style.display = "flex";

    loginError.textContent = "";
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const errorElement = document.getElementById("registerError");
    const button = registerForm.querySelector("button[type='submit']");

    errorElement.textContent = "";

    if (password.length < 8) {
      errorElement.textContent = "A senha precisa ter pelo menos 8 caracteres.";
      return;
    }

    if (password !== confirmPassword) {
      errorElement.textContent = "As senhas não coincidem.";
      return;
    }

    button.disabled = true;
    button.textContent = "Criando conta...";

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,

        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        registerForm.reset();

        registerScreen.style.display = "none";
        app.style.display = "block";

        showToast("Conta criada com sucesso!");

        await loadData();
      } else {
        loginError.textContent =
          "Conta criada, mas não foi possível iniciar a sessão. Tente fazer login.";

        registerScreen.style.display = "none";
        loginScreen.style.display = "flex";
      }
    } catch (error) {
      console.error("Erro ao cadastrar:", error);

      errorElement.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Criar conta";
    }
  });

  const loginButton = loginForm.querySelector("button[type='submit']");

  app.style.display = "none";

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    loginError.textContent = "";

    loginButton.disabled = true;
    loginButton.textContent = "Conectando...";

    try {
      console.log("Tentando autenticar:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("O Supabase não retornou uma sessão.");
      }

      console.log("Login realizado:", data.user.email);

      loginScreen.style.display = "none";
      app.style.display = "block";

      loginForm.reset();

      await loadData();

      showToast("Bem-vindo ao LogiPro!");
    } catch (error) {
      console.error("Erro de autenticação:", error);

      loginError.textContent = error.message;
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Entrar na plataforma";
    }
  });

  // Verificar sessão existente
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Erro ao recuperar sessão:", error);
  }

  if (data?.session) {
    loginScreen.style.display = "none";
    app.style.display = "block";
    await loadData();
  } else {
    loginScreen.style.display = "flex";
    app.style.display = "none";
  }
});

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    showToast("Erro ao sair da conta.");
    console.error(error);
    return;
  }

  document.querySelector(".app").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
}

window.logout = logout;

let orders = [];
let clients = [];
let drivers = [];
let expenses = [];

async function loadData() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Usuário não autenticado.");
    return;
  }

  try {
    // =================================
    // 1. CARREGAR PERFIL
    // =================================

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    // =================================
    // 2. ATUALIZAR DADOS DO USUÁRIO
    // =================================

    const name = profile.full_name || user.email;

    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");

    document.querySelector(".user-profile strong").textContent = name;

    document.querySelector(".user-profile small").textContent = user.email;

    document.querySelector(".avatar").textContent = initials;

    document.getElementById("topUserAvatar").textContent = initials;

    // =================================
    // 3. CARREGAR ENTREGAS, CLIENTES E ENTREGADORES
    // =================================

    const [ordersResponse, clientsResponse, driversResponse, expensesResponse] =
      await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("drivers")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("expense_date", { ascending: false }),
      ]);

    if (ordersResponse.error) throw ordersResponse.error;
    if (clientsResponse.error) throw clientsResponse.error;
    if (driversResponse.error) throw driversResponse.error;
    if (expensesResponse.error) throw expensesResponse.error;

    orders = ordersResponse.data || [];
    clients = clientsResponse.data || [];
    drivers = driversResponse.data || [];
    expenses = expensesResponse.data || [];

    renderAll();

    console.log("Perfil e dados carregados com sucesso!");
  } catch (error) {
    console.error("Erro ao carregar dados:", error);

    showToast("Erro ao carregar dados: " + error.message);
  }
}

function renderFinanceiro() {
  // FORMATAÇÃO MONETÁRIA
  const money = (value) => {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const now = new Date();

  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // RECEITA: ENTREGAS CONCLUÍDAS NO MÊS ATUAL
  const monthlyOrders = orders.filter((order) => {
    if (order.status !== "Entregue") return false;

    const date = new Date(order.created_at);

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  });

  const revenue = monthlyOrders.reduce(
    (total, order) => total + Number(order.value || 0),
    0,
  );

  // DESPESAS DO MÊS
  const monthlyExpenses = expenses.filter((expense) => {
    return expense.expense_date?.substring(0, 7) === currentYearMonth;
  });

  const totalExpenses = monthlyExpenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0,
  );

  // RESULTADO FINANCEIRO
  const result = revenue - totalExpenses;

  // INDICADORES FINANCEIROS
  const financeRevenue = document.getElementById("financeRevenue");
  const financeExpenses = document.getElementById("financeExpenses");
  const financeResult = document.getElementById("financeResult");

  if (financeRevenue) {
    financeRevenue.textContent = money(revenue);
  }

  if (financeExpenses) {
    financeExpenses.textContent = money(totalExpenses);
  }

  if (financeResult) {
    financeResult.textContent = money(result);
  }

  // DASHBOARD
  const dashboardRevenue = document.getElementById("dashboardRevenue");

  if (dashboardRevenue) {
    dashboardRevenue.textContent = money(revenue);
  }

  // HISTÓRICO DE DESPESAS
  const expensesTable = document.getElementById("expensesTable");

  if (expensesTable) {
    expensesTable.innerHTML =
      expenses
        .map(
          (expense) => `

            <tr>
                <td>
                    <strong>${escapeHTML(expense.description)}</strong>
                </td>

                <td>${escapeHTML(expense.category)}</td>

                <td>
                    ${new Date(
                      expense.expense_date + "T12:00:00",
                    ).toLocaleDateString("pt-BR")}
                </td>

                <td>${money(expense.amount)}</td>

                <td>
                    <button
                        class="delete-btn"
                        onclick="deleteRecord('expenses', '${escapeHTML(expense.id)}', 'esta despesa')"
                        title="Excluir despesa"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>

        `,
        )
        .join("") ||
      `<tr>
            <td colspan="5">Nenhuma despesa registrada.</td>
        </tr>`;
  }

  // ATUALIZAR ÍCONES
  if (window.lucide) {
    lucide.createIcons();
  }
}

const pageTitles = {
  dashboard: "Dashboard",
  entregas: "Gestão de entregas",
  clientes: "Clientes parceiros",
  entregadores: "Entregadores",
  financeiro: "Financeiro",
  cotacao: "Cotação de frete",
  rastreamento: "Rastreamento",
};

function showPage(page) {
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.remove("active");
  });

  const selectedPage = document.getElementById(page);

  if (!selectedPage) return;

  selectedPage.classList.add("active");

  const navButton = document.querySelector(`.nav-item[data-page="${page}"]`);

  if (navButton) navButton.classList.add("active");

  document.getElementById("pageTitle").textContent =
    pageTitles[page] || "LogiPro";

  document.getElementById("sidebar").classList.remove("open");

  renderAll();

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (window.lucide) lucide.createIcons();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// MENU MOBILE

document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// DATA ATUAL

document.getElementById("currentDate").textContent =
  new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function getStatusClass(status) {
  if (status === "Entregue") return "entregue";
  if (status === "Em trânsito") return "transito";
  return "pendente";
}

function renderOrders() {
  function createRow(order) {
    return `
        <tr>
            <td><strong>${escapeHTML(order.code)}</strong></td>

            <td>${escapeHTML(order.client)}</td>

            <td>${escapeHTML(order.driver)}</td>

            <td>${escapeHTML(order.destination)}</td>

            <td>
                R$ ${Number(order.value || 0)
                  .toFixed(2)
                  .replace(".", ",")}
            </td>

            <td>
                <span class="status ${getStatusClass(order.status)}">
                    ${escapeHTML(order.status)}
                </span>
            </td>

            <td>
                <button
                    class="delete-btn"
                    onclick="deleteRecord('orders', '${escapeHTML(order.id)}', 'esta entrega')"
                    title="Excluir entrega"
                >
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `;
  }

  document.getElementById("dashboardOrders").innerHTML = orders
    .slice(0, 3)
    .map(createRow)
    .join("");

  document.getElementById("ordersTable").innerHTML =
    orders.map(createRow).join("") ||
    `<tr><td colspan="6">Nenhuma entrega cadastrada.</td></tr>`;

  document.getElementById("totalEntregas").textContent = orders.length;

  document.getElementById("emAndamento").textContent = orders.filter(
    (o) => o.status === "Em trânsito",
  ).length;

  // ATUALIZAR INDICADOR DE ENTREGAS
  const comparison = document.getElementById("deliveryComparison");

  if (comparison) {
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (date1, date2) => {
      const d1 = new Date(date1);
      const d2 = new Date(date2);

      return (
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear()
      );
    };

    const todayOrders = orders.filter((order) =>
      isSameDay(order.created_at, today),
    ).length;

    const yesterdayOrders = orders.filter((order) =>
      isSameDay(order.created_at, yesterday),
    ).length;

    let percentage = 0;

    if (yesterdayOrders > 0) {
      percentage = ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100;
    }

    if (yesterdayOrders === 0 && todayOrders > 0) {
      comparison.textContent = "Novas entregas hoje";
    } else if (yesterdayOrders === 0 && todayOrders === 0) {
      comparison.textContent = "0% vs. ontem";
    } else {
      const signal = percentage > 0 ? "+" : "";

      comparison.textContent = `${signal}${percentage.toFixed(1).replace(".", ",")}% vs. ontem`;
    }

    comparison.classList.toggle("positive", percentage >= 0);
    comparison.classList.toggle("negative", percentage < 0);
  }
}

function renderClients() {
  document.getElementById("clientsTable").innerHTML =
    clients
      .map(
        (client) => `

            <tr>

                <td>
                    <strong>${escapeHTML(client.name)}</strong>
                </td>

                <td>${escapeHTML(client.cnpj)}</td>

                <td>${escapeHTML(client.email)}</td>

                <td>
                    ${orders.filter((o) => o.client === client.name).length}
                </td>

                <td>
                    <button
                        class="delete-btn"
                        onclick="deleteRecord('clients', '${escapeHTML(client.id)}', 'este cliente')"
                        title="Excluir cliente"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>

            </tr>

        `,
      )
      .join("") || `<tr><td colspan="5">Nenhum cliente cadastrado.</td></tr>`;

  if (window.lucide) lucide.createIcons();
}

function renderDrivers() {
  // Atualizar quantidade de entregadores ativos no Dashboard
  const totalDriversElement = document.getElementById("totalDrivers");

  if (totalDriversElement) {
    totalDriversElement.textContent = drivers.filter(
      (driver) => driver.status === "Ativo",
    ).length;
  }

  document.getElementById("driversTable").innerHTML =
    drivers
      .map(
        (driver) => `

            <tr>

                <td>
                    <strong>${escapeHTML(driver.name)}</strong>
                </td>

                <td>${escapeHTML(driver.vehicle)}</td>

                <td>${escapeHTML(driver.phone)}</td>

                <td>
                    <span class="status entregue">
                        ${escapeHTML(driver.status)}
                    </span>
                </td>

                <td>
                    <button
                        class="delete-btn"
                        onclick="deleteRecord('drivers', '${escapeHTML(driver.id)}', 'este entregador')"
                        title="Excluir entregador"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>

            </tr>

        `,
      )
      .join("") ||
    `<tr><td colspan="5">Nenhum entregador cadastrado.</td></tr>`;

  if (window.lucide) lucide.createIcons();
}

function renderAll() {
  renderOrders();
  renderClients();
  renderDrivers();
  renderFinanceiro();
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char],
  );
}

document
  .getElementById("clientForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = event.target.querySelector("button[type='submit']");

    button.disabled = true;
    button.textContent = "Salvando...";

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Faça login novamente.");
      }

      const client = {
        user_id: user.id,

        name: document.getElementById("clientName").value.trim(),

        cnpj: document.getElementById("clientCnpj").value.trim(),

        email: document.getElementById("clientEmail").value.trim(),
      };

      const { data, error } = await supabase
        .from("clients")
        .insert([client])
        .select()
        .single();

      if (error) throw error;

      clients.unshift(data);

      renderClients();

      closeModal("clientModal");

      event.target.reset();

      showToast("Cliente salvo no banco com sucesso!");
    } catch (error) {
      console.error(error);

      showToast("Erro ao cadastrar cliente: " + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Salvar cliente";
    }
  });

document
  .getElementById("expenseForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.target;

    const button = form.querySelector("button[type='submit']");

    button.disabled = true;
    button.textContent = "Salvando...";

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Faça login novamente.");
      }

      const expense = {
        user_id: user.id,

        description: document.getElementById("expenseDescription").value.trim(),

        category: document.getElementById("expenseCategory").value,

        amount: Number(document.getElementById("expenseAmount").value),

        expense_date: document.getElementById("expenseDate").value,
      };

      if (
        !expense.description ||
        !Number.isFinite(expense.amount) ||
        expense.amount <= 0 ||
        !expense.expense_date
      ) {
        throw new Error("Preencha os dados corretamente.");
      }

      const { data, error } = await supabase
        .from("expenses")
        .insert([expense])
        .select()
        .single();

      if (error) throw error;

      expenses.unshift(data);

      form.reset();

      renderFinanceiro();

      showToast("Despesa salva no Supabase!");
    } catch (error) {
      console.error("Erro financeiro:", error);

      showToast("Erro ao salvar despesa: " + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Salvar despesa";
    }
  });

document.getElementById("expenseDate").value = new Date().toLocaleDateString(
  "en-CA",
);

document
  .getElementById("driverForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = event.target.querySelector("button[type='submit']");

    button.disabled = true;
    button.textContent = "Salvando...";

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Faça login novamente.");
      }

      const driver = {
        user_id: user.id,

        name: document.getElementById("driverName").value.trim(),

        phone: document.getElementById("driverPhone").value.trim(),

        vehicle: document.getElementById("driverVehicle").value,

        status: "Ativo",
      };

      const { data, error } = await supabase
        .from("drivers")
        .insert([driver])
        .select()
        .single();

      if (error) throw error;

      drivers.unshift(data);

      renderDrivers();

      closeModal("driverModal");

      event.target.reset();

      showToast("Entregador salvo no banco com sucesso!");
    } catch (error) {
      console.error(error);

      showToast("Erro ao cadastrar entregador: " + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Cadastrar entregador";
    }
  });

function openModal(id) {
  document.getElementById(id).classList.add("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("open");
    }
  });
});

function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

document.getElementById("searchOrders").addEventListener("input", filterOrders);
document
  .getElementById("filterStatus")
  .addEventListener("change", filterOrders);

function filterOrders() {
  const search = document
    .getElementById("searchOrders")
    .value.toLowerCase()
    .trim();

  const status = document.getElementById("filterStatus").value;

  const filtered = orders.filter((order) => {
    const code = String(order.code || "").toLowerCase();
    const client = String(order.client || "").toLowerCase();

    const matchesSearch = code.includes(search) || client.includes(search);

    const matchesStatus = !status || order.status === status;

    return matchesSearch && matchesStatus;
  });

  document.getElementById("ordersTable").innerHTML =
    filtered
      .map(
        (order) => `
            <tr>
                <td><strong>${escapeHTML(order.code)}</strong></td>
                <td>${escapeHTML(order.client)}</td>
                <td>${escapeHTML(order.driver)}</td>
                <td>${escapeHTML(order.destination)}</td>
                <td>R$ ${Number(order.value || 0)
                  .toFixed(2)
                  .replace(".", ",")}</td>
                <td>
                    <span class="status ${getStatusClass(order.status)}">
                        ${escapeHTML(order.status)}
                    </span>
                </td>
            </tr>
        `,
      )
      .join("") || `<tr><td colspan="6">Nenhuma entrega encontrada.</td></tr>`;
}

// ==========================================
// EXCLUIR REGISTROS DO SUPABASE
// ==========================================

async function deleteRecord(table, id, description) {
  const confirmed = confirm(
    `Tem certeza que deseja excluir ${description}? Essa ação não poderá ser desfeita.`,
  );

  if (!confirmed) return;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Faça login novamente.");
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    // Atualizar os dados locais
    if (table === "orders") {
      orders = orders.filter((item) => item.id !== id);
    }

    if (table === "clients") {
      clients = clients.filter((item) => item.id !== id);
    }

    if (table === "drivers") {
      drivers = drivers.filter((item) => item.id !== id);
    }

    if (table === "expenses") {
      expenses = expenses.filter((item) => item.id !== id);
    }

    // Atualizar todas as telas
    renderAll();

    showToast("Registro excluído com sucesso!");
  } catch (error) {
    console.error("Erro ao excluir:", error);

    showToast("Erro ao excluir: " + error.message);
  }
}

window.deleteRecord = deleteRecord;

document
  .getElementById("quoteForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Faça login novamente.");
      }

      const origin = document.getElementById("originCep").value.trim();
      const destination = document
        .getElementById("destinationCep")
        .value.trim();

      const vehicle = document.getElementById("vehicle").value;
      const service = document.getElementById("serviceType").value;

      if (!validCep(origin) || !validCep(destination)) {
        showToast("Informe dois CEPs válidos.");
        return;
      }

      const basePrices = {
        moto: 12,
        carro: 25,
        bike: 8,
      };

      const multiplier = service === "express" ? 1.5 : 1;

      const variation =
        ((Number(origin.replace(/\D/g, "").slice(-2)) +
          Number(destination.replace(/\D/g, "").slice(-2))) %
          10) *
        0.8;

      const price = Number(
        ((basePrices[vehicle] + variation) * multiplier).toFixed(2),
      );

      // SALVAR COTAÇÃO NO BANCO
      const quote = {
        user_id: user.id,
        origin_cep: origin,
        destination_cep: destination,
        vehicle: vehicle,
        service_type: service,
        value: price,
      };

      const { error } = await supabase.from("quotes").insert(quote);

      if (error) throw error;

      const names = {
        moto: "Moto",
        carro: "Carro",
        bike: "Bicicleta",
      };

      const result = document.getElementById("quoteResult");

      result.classList.remove("hidden");

      result.innerHTML = `
            <span>Valor estimado da entrega</span>

            <h2>R$ ${price.toFixed(2).replace(".", ",")}</h2>

            <p>Modal: ${names[vehicle]}</p>

            <p>Serviço: ${service === "express" ? "Expresso" : "Normal"}</p>

            <p>Coleta: ${escapeHTML(origin)}</p>

            <p>Destino: ${escapeHTML(destination)}</p>

            <small>
                Simulação ilustrativa. Não representa uma cotação comercial real.
            </small>

            <br><br>

            <button type="button" class="primary-btn" id="requestDelivery">
                Solicitar entrega
            </button>
        `;

      document
        .getElementById("requestDelivery")
        .addEventListener("click", () => {
          createOrder(origin, destination, price);
        });

      showToast("Cotação salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar cotação:", error);

      showToast("Erro ao salvar cotação: " + error.message);
    }
  });

// VALIDAÇÃO DE CEP

function validCep(cep) {
  return /^\d{5}-?\d{3}$/.test(cep);
}

// ==========================================
// RASTREAMENTO COM HISTÓRICO POR USUÁRIO
// ==========================================

document
  .getElementById("trackingForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = document.getElementById("trackingCode");
    const result = document.getElementById("trackingResult");
    const button = event.target.querySelector("button[type='submit']");

    const code = input.value.trim().toUpperCase();

    // LIMPAR RESULTADO DA PESQUISA ANTERIOR
    result.innerHTML = "";

    button.disabled = true;
    button.textContent = "Consultando...";

    try {
      // 1. IDENTIFICAR USUÁRIO LOGADO
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Faça login novamente.");
      }

      // 2. BUSCAR ENTREGA DO USUÁRIO
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("code", code)
        .maybeSingle();

      if (orderError) throw orderError;

      if (!order) {
        result.innerHTML = `
                    <p style="color:#ef4444">
                        Código não encontrado.
                    </p>
                `;
        return;
      }

      // 3. SALVAR CONSULTA VINCULADA À CONTA
      const { error: historyError } = await supabase
        .from("tracking_history")
        .insert({
          user_id: user.id,
          tracking_code: code,
        });

      if (historyError) throw historyError;

      // 4. MONTAR LINHA DO TEMPO
      let timeline = "";

      if (order.status === "Pendente") {
        timeline = `
                    <div class="timeline-item">
                        <strong>Pedido recebido</strong>
                        <p>Seu pedido foi registrado.</p>
                    </div>
                `;
      } else if (order.status === "Em trânsito") {
        timeline = `
                    <div class="timeline-item">
                        <strong>Pedido recebido</strong>
                        <p>Solicitação registrada.</p>
                    </div>

                    <div class="timeline-item">
                        <strong>Em trânsito</strong>
                        <p>Sua encomenda está a caminho.</p>
                    </div>
                `;
      } else if (order.status === "Entregue") {
        timeline = `
                    <div class="timeline-item">
                        <strong>Pedido recebido</strong>
                        <p>Solicitação registrada.</p>
                    </div>

                    <div class="timeline-item">
                        <strong>Em trânsito</strong>
                        <p>Encomenda encaminhada para entrega.</p>
                    </div>

                    <div class="timeline-item">
                        <strong>Entregue</strong>
                        <p>A entrega foi concluída.</p>
                    </div>
                `;
      }

      // 5. MOSTRAR RESULTADO
      result.innerHTML = `
                <h3>Pedido ${escapeHTML(order.code)}</h3>

                <p>
                    Destino:
                    ${escapeHTML(order.destination)}
                </p>

                <p>
                    Status atual:
                    <span class="status ${getStatusClass(order.status)}">
                        ${escapeHTML(order.status)}
                    </span>
                </p>

                <div class="timeline">
                    ${timeline}
                </div>
            `;

      showToast("Rastreamento consultado com sucesso!");
    } catch (error) {
      console.error("Erro no rastreamento:", error);

      showToast("Erro ao consultar rastreamento: " + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Rastrear";
    }
  });
document.getElementById("trackingCode").addEventListener("input", () => {
  document.getElementById("trackingResult").innerHTML = "";
});
// ==========================================
// CRIAR ENTREGA NO SUPABASE
// ==========================================

async function createOrder(origin, destination, price) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Faça login novamente.");
    }

    const code = "LP" + Date.now();

    const newOrder = {
      user_id: user.id,

      code: code,

      client: "Cliente avulso",

      driver: "A definir",

      origin: origin,

      destination: destination,

      value: price,

      status: "Pendente",
    };

    const { data, error } = await supabase
      .from("orders")
      .insert([newOrder])
      .select()
      .single();

    if (error) throw error;

    orders.unshift(data);

    renderAll();

    document.getElementById("quoteResult").classList.add("hidden");

    document.getElementById("quoteForm").reset();

    showToast("Entrega salva! Código: " + code);

    showPage("entregas");
  } catch (error) {
    console.error("Erro ao criar entrega:", error);

    showToast("Erro ao salvar entrega: " + error.message);
  }
}

window.showPage = showPage;
window.openModal = openModal;
window.closeModal = closeModal;
window.createOrder = createOrder;
window.logout = logout;
