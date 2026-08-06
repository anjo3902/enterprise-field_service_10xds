export default function AppMark({ className = 'w-8 h-8' }) {
  return (
    <svg
      viewBox='0 0 48 48'
      className={className}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
    >
      <rect x='4' y='4' width='40' height='40' rx='10' fill='#1f2937' />
      <path d='M24 11L36 18V30L24 37L12 30V18L24 11Z' fill='#f97316' />
      <path d='M24 18L30 21.5V28.5L24 32L18 28.5V21.5L24 18Z' fill='white' />
    </svg>
  )
}
