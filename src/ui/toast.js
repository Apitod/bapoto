/** Toast notifier global (identik dengan alertToast lama). */
let toastTimeout;

export function alertToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;

    clearTimeout(toastTimeout);
    toast.classList.remove('translate-x-[150%]');

    toastTimeout = setTimeout(() => {
        toast.classList.add('translate-x-[150%]');
    }, 3000);
}
