


export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
       
          <h1 className="text-4xl font-bold">TODO List</h1>
          
          <input style={{width: '200px', height: '30px'}} type="text" placeholder="Enter TODO" />
          <button style={{width: '100px', height: '30px'}}>添加</button>
        

      </main>
      
    </div>
  );
}
