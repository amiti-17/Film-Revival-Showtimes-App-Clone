export function Header (props) {

  const {isAdminMode} = props;
  
 return (
  <header className="app-title" style={{ textAlign: 'center', margin: '20px 0' }}>
    <h1>Film Revival NYC</h1>
    {isAdminMode && (
      <div className="admin-badge">
        Admin Mode (⌘+Shift+A to toggle)
      </div>
    )}
  </header>
 )
}