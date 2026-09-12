export const THEME_KEY = "dp-theme";

// Runs in <head> before paint. Storage can be unavailable in private contexts;
// the OS preference still works and zoom remains unrestricted.
export const THEME_INIT = `(function(){var p="system";try{var s=localStorage.getItem("${THEME_KEY}");if(s==="light"||s==="dark")p=s}catch(e){}var dark=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",dark);r.style.colorScheme=dark?"dark":"light";r.dataset.themePreference=p})()`;
