import { useState } from "react";
import CalendarView from "./CalendarView";
import { Header } from "./Header";
import { LoadingProgress } from "./LoadingProgress";

export function FilmRevival () {

  const [isLoading, setIsLoading ] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(() => {
    // Check localStorage on initial load
    return localStorage.getItem('filmRevivalAdminMode') === 'true';
  });

  return (
    <>
      <Header isAdminMode={isAdminMode} />
      <CalendarView isAdminMode={isAdminMode} setIsAdminMode={setIsAdminMode} isLoading={isLoading} setIsLoading={setIsLoading} />
      {isLoading && <LoadingProgress />}
    </>
  )
}