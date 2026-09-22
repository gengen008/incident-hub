import toast from 'react-hot-toast'

export const toastSuccess = (message: string, description?: string) =>
  toast.success(description ? `${message}: ${description}` : message)

export const toastError = (message: string, description?: string) =>
  toast.error(description ? `${message}: ${description}` : message)

export const toastInfo = (message: string) =>
  toast(message, { icon: 'ℹ️' })

export { toast }
