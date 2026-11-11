
const STORAGE_KEY = "grade-tracker-assignments";
const THEME_KEY = "grade-tracker-theme";

const form = document.querySelector("#assignment-form");
const nameInput = document.querySelector("#assignment-name");
const classInput = document.querySelector("#class-name");
const earnedInput = document.querySelector("#earned-points");
const possibleInput = document.querySelector("#possible-points");
const saveButton = document.querySelector("#save-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const formTitle = document.querySelector("#form-title");
const formMessage = document.querySelector("#form-message");
const assignmentList = document.querySelector("#assignment-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const filterSelect = document.querySelector("#filter-select");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const themeLabel = document.querySelector("#theme-label");

let assignments = loadAssignments();
let editingId = null;

// LOAD SAVED ASSIGNMENTS
function loadAssignments() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.warn("Could not read saved assignments:", error);
        return [];
    }
}

// SAVE ASSIGNMENTS
function saveAssignments() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

// CHECK IF ASSIGNMENT IS GRADED
function isGraded(item) {
    return item.earned !== null && item.possible !== null;
}

// CALCULATE PERCENTAGE
function percentage(item) {
    return (item.earned / item.possible) * 100;
}

function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}

// UPDATE DASHBOARD
function updateSummary() {
    const graded = assignments.filter(isGraded);

    const average = graded.length
        ? graded.reduce((sum, item) => sum + percentage(item), 0) / graded.length
        : null;

    document.querySelector("#overall-average").textContent =
        average === null ? "—" : formatPercent(average);

    document.querySelector("#average-caption").textContent =
        average === null ? "No graded assignments yet" : "Average of graded assignments";

    document.querySelector("#total-count").textContent = assignments.length;
    document.querySelector("#graded-count").textContent = graded.length;
    document.querySelector("#pending-count").textContent =
        assignments.length - graded.length;
}

// CREATE BUTTONS
function makeActionButton(label, action, id, extraClass = "") {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `small-button ${extraClass}`.trim();
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = id;

    return button;
}

// DISPLAY ASSIGNMENTS
function renderAssignments() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = filterSelect.value;

    const visible = assignments.filter((item) => {
        const matchesQuery =
            item.name.toLowerCase().includes(query) ||
            item.className.toLowerCase().includes(query);

        const matchesFilter =
            filter === "all" ||
            (filter === "graded" && isGraded(item)) ||
            (filter === "pending" && !isGraded(item));

        return matchesQuery && matchesFilter;
    });

    assignmentList.replaceChildren();

    document.querySelector("#visible-count").textContent =
        `${visible.length} ${visible.length === 1 ? "item" : "items"}`;

    emptyState.classList.toggle("hidden", visible.length > 0);

    if (assignments.length === 0) {
        emptyState.textContent =
            "No assignments yet. Add your first assignment using the form.";
    } else if (visible.length === 0) {
        emptyState.textContent =
            "No assignments match your search or filter.";
    }

    visible.forEach((item) => {
        const card = document.createElement("article");
        card.className = "assignment-card";

        const main = document.createElement("div");
        main.className = "assignment-main";

        const title = document.createElement("p");
        title.className = "assignment-name";
        title.textContent = item.name;

        const meta = document.createElement("p");
        meta.className = "assignment-meta";
        meta.textContent = item.className;

        const status = document.createElement("span");
        status.className = `status ${isGraded(item) ? "graded" : ""}`;
        status.textContent = isGraded(item) ? "Graded" : "Not graded";

        title.append(" ", status);
        main.append(title, meta);

        if (isGraded(item)) {
            const score = document.createElement("span");
            score.className = "assignment-score";

            score.textContent =
                `${item.earned} / ${item.possible} points · ${formatPercent(percentage(item))}`;

            main.append(score);
        }

        const actions = document.createElement("div");
        actions.className = "assignment-actions";

        actions.append(
            makeActionButton("Edit", "edit", item.id),
            makeActionButton(
                isGraded(item) ? "Mark pending" : "Mark graded",
                "toggle",
                item.id
            ),
            makeActionButton("Delete", "delete", item.id, "delete")
        );

        card.append(main, actions);
        assignmentList.append(card);
    });

    updateSummary();
}

// RESET FORM
function resetForm() {
    form.reset();

    editingId = null;

    saveButton.textContent = "Add assignment";
    cancelEditButton.classList.add("hidden");
    formTitle.textContent = "Add an assignment";
    formMessage.textContent = "";
}

// EDIT ASSIGNMENT
function startEditing(id) {
    const item = assignments.find((assignment) => assignment.id === id);

    if (!item) return;

    editingId = id;

    nameInput.value = item.name;
    classInput.value = item.className;
    earnedInput.value = item.earned ?? "";
    possibleInput.value = item.possible ?? "";

    saveButton.textContent = "Save changes";
    cancelEditButton.classList.remove("hidden");
    formTitle.textContent = "Edit assignment";

    formMessage.textContent = "Update the details and save your changes.";

    nameInput.focus();
}

// ADD OR UPDATE ASSIGNMENT
form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const className = classInput.value.trim();

    const earnedText = earnedInput.value.trim();
    const possibleText = possibleInput.value.trim();

    if (!name || !className) {
        formMessage.textContent = "Enter an assignment name and class.";
        return;
    }

    if ((earnedText && !possibleText) || (!earnedText && possibleText)) {
        formMessage.textContent = "Enter both score fields, or leave both empty.";
        return;
    }

    let earned = null;
    let possible = null;

    if (earnedText && possibleText) {
        earned = Number(earnedText);
        possible = Number(possibleText);

        if (
            !Number.isFinite(earned) ||
            !Number.isFinite(possible) ||
            earned < 0 ||
            possible <= 0 ||
            earned > possible
        ) {
            formMessage.textContent =
                "Scores must be valid, and points earned cannot exceed points possible.";
            return;
        }
    }

    if (editingId) {
        assignments = assignments.map((item) =>
            item.id === editingId
                ? { ...item, name, className, earned, possible }
                : item
        );

        formMessage.textContent = "Assignment updated.";
    } else {
        assignments.unshift({
            id: crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now() + Math.random()),
            name,
            className,
            earned,
            possible,
            createdAt: new Date().toISOString()
        });

        formMessage.textContent = "Assignment added.";
    }

    saveAssignments();
    renderAssignments();
    resetForm();
});

// EDIT, DELETE, AND UPDATE STATUS
assignmentList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    const item = assignments.find((assignment) => assignment.id === id);

    if (!item) return;

    if (action === "edit") {
        startEditing(id);

    } else if (action === "toggle") {

        if (isGraded(item)) {
            item.earned = null;
            item.possible = null;
        } else {
            startEditing(id);
            formMessage.textContent =
                "Enter the score to mark this assignment as graded.";
            return;
        }

        saveAssignments();
        renderAssignments();

    } else if (action === "delete") {

        assignments = assignments.filter(
            (assignment) => assignment.id !== id
        );

        if (editingId === id) {
            resetForm();
        }

        saveAssignments();
        renderAssignments();
    }
});

// CANCEL EDITING
cancelEditButton.addEventListener("click", resetForm);

// SEARCH AND FILTER
searchInput.addEventListener("input", renderAssignments);
filterSelect.addEventListener("change", renderAssignments);

// DARK AND LIGHT MODE
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    const dark = theme === "dark";

    themeIcon.textContent = dark ? "☀" : "☾";
    themeLabel.textContent = dark ? "Light mode" : "Dark mode";

    localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "light";

    applyTheme(current === "light" ? "dark" : "light");
});

// LOAD SAVED THEME
const savedTheme = localStorage.getItem(THEME_KEY);

applyTheme(savedTheme === "dark" ? "dark" : "light");

// INITIAL DISPLAY
renderAssignments();
