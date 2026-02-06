// Split du nom de l'utilisateur avec son prénom
export function splitUserName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: "", lastName: "" };
  }

  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

// Capitalise la première lettre de chaque mot du nom
export function capitalizeName(name) {
  if (!name || typeof name !== "string") return "";

  return name.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}


