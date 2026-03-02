const syncToCloud = useCallback(async (currStudents: Student[], currRecords: AttendanceRecord[], currPricing: PricingConfig) => {
  const targetUrl = currentSchoolConfig?.syncUrl;
  const targetKey = currentSchoolConfig?.syncKey;
  if (!targetUrl) return;
  
  setCloud(prev => ({ ...prev, isSyncing: true }));
  try {
    const appData: AppData = { students: currStudents, records: currRecords, pricing: currPricing, version: Date.now() };
    
    // ✅ Verwijder 'no-cors' - laat de browser normale CORS checks doen
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: targetKey, action: 'save', data: appData })
    });
    
    // ✅ Check of de response OK is
    if (!response.ok) {
      throw new Error(`Server antwoord: ${response.status} ${response.statusText}`);
    }
    
    // ✅ Probeer het antwoord te parsen
    let result;
    try {
      result = await response.json();
    } catch (parseErr) {
      console.warn('Google Apps Script antwoord is geen JSON', response.statusText);
      result = { success: response.ok };
    }
    
    if (result.success === false) {
      throw new Error(result.error || 'Server gaf fout');
    }
    
    console.log('✅ Data succesvol opgeslagen:', { students: currStudents.length, records: currRecords.length });
    setCloud(prev => ({ ...prev, isSyncing: false, isConnected: true, lastSync: new Date().toISOString() }));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Sync mislukt';
    console.error('❌ Sync fout:', errorMsg);
    setCloud(prev => ({ ...prev, isSyncing: false, error: errorMsg })); 
  }
}, [currentSchoolConfig]);
}
