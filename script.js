// سنة الفوتر
document.getElementById("year").textContent = new Date().getFullYear();

// زرار تغيير الوضع (Dark / Light)
const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");

// دالة تغيير الثيم
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  if (theme === "light") {
    themeIcon.textContent = "☀️";
  } else {
    themeIcon.textContent = "🌙";
  }
}

// تحميل الثيم المحفوظ
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  setTheme(savedTheme);
} else {
  setTheme("dark");
}

// حدث الضغط على زرار الثيم
themeBtn.addEventListener("click", function () {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";

  if (currentTheme === "dark") {
    setTheme("light");
  } else {
    setTheme("dark");
  }
});

// نموذج التواصل (mailto بدون باك إند)
const form = document.getElementById("contactForm");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(form);

  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  const subject = encodeURIComponent(
    "رسالة من موقع حسام حسن - " + name
  );

  const body = encodeURIComponent(
    "الاسم: " + name + "\n" +
    "الإيميل: " + email + "\n\n" +
    "الرسالة:\n" + message
  );

  const mailtoLink =
    "mailto:hojhhgk@gmail.com" +
    "?subject=" + subject +
    "&body=" + body;

  window.location.href = mailtoLink;

  form.reset();
});