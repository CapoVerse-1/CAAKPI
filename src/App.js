import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FiUpload, FiPlus, FiZap, FiSettings, FiPauseCircle, FiPlayCircle, FiLoader, FiDatabase, FiSend as FiOutreach, FiSave } from 'react-icons/fi'; // Added history/nav icons
import * as XLSX from 'xlsx'; // Import xlsx library
import OpenAI from "openai"; // Import OpenAI
import './App.css';
import PromoterCard from './components/PromoterCard'; // We will create this next
import ImportModal from './components/ImportModal'; // Import the modal component
import SettingsPanel from './components/SettingsPanel'; // Import SettingsPanel
import HistoryStats from './components/HistoryStats'; // Import the new stats component
import Select from 'react-select'; // Import react-select
import { supabase } from './supabaseClient'; // Import Supabase client

// Function to initialize OpenAI client based on available keys
const initializeOpenAI = (uiKey, envKey) => {
    const keyToUse = uiKey || envKey;
    if (!keyToUse) {
        console.warn("OpenAI API key not found in settings or environment variables.");
        return null;
    }
    // WARNING: dangerouslyAllowBrowser: true is NOT recommended for production.
    // Use a backend proxy instead.
    return new OpenAI({ apiKey: keyToUse, dangerouslyAllowBrowser: true });
};

function App() {
  // Main state
  const [promoters, setPromoters] = useState([]); // Will fetch from outreach_promoters
  const [historyEntries, setHistoryEntries] = useState([]); // Will fetch from promoter_history
  const [inactivePromoters, setInactivePromoters] = useState(new Set()); // Will fetch from inactive_promoters

  // UI / Control State
  const [currentPage, setCurrentPage] = useState('outreach'); // 'outreach' or 'history'
  const [historyFilter, setHistoryFilter] = useState('All'); // Filter for history page
  const [isLoading, setIsLoading] = useState(true); // Start loading true for initial fetch
  const [error, setError] = useState(''); // To display import errors
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // State for settings panel
  // State for API Key: Initialize from localStorage or fallback to env var
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('openaiApiKey') || '');
  // Memoize OpenAI client initialization
  const [openaiClient, setOpenaiClient] = useState(() => initializeOpenAI(userApiKey, process.env.REACT_APP_OPENAI_API_KEY));
  const [generatingIds, setGeneratingIds] = useState(new Set()); // Store loading state per promoter ID
  // NEW: State for overall generation control: 'idle', 'running', 'paused'
  const [generationStatus, setGenerationStatus] = useState('idle'); 
  // Ref to store the next index to process when paused
  const nextPromoterIndexRef = useRef(0); 
  // Ref to signal stop request
  const stopGenerationRef = useRef(false); 
  const fileInputRef = useRef(null); // Ref for the hidden file input

  // --- Effects --- 
  // NEW: Effect to fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        // Fetch outreach promoters
        const { data: outreachData, error: outreachError } = await supabase
          .from('outreach_promoters')
          .select('*')
          .order('created_at', { ascending: true }); // Or order as needed
        if (outreachError) throw outreachError;
        // Map Supabase data to match app state structure (e.g., rename is_marked_sent)
        setPromoters(outreachData.map(p => ({ ...p, isMarkedSent: p.is_marked_sent })) || []);

        // Fetch history entries
        const { data: historyData, error: historyError } = await supabase
          .from('promoter_history')
          .select('*')
          .order('created_at', { ascending: false }); // Fetch newest history first
        if (historyError) throw historyError;
        // Map Supabase data (rename generated_email, map app_saved_at?)
        setHistoryEntries(historyData.map(h => ({ 
            ...h, 
            generatedEmail: h.generated_email, 
            historyId: h.id, // Use Supabase ID as historyId
            savedAt: h.app_saved_at || h.created_at // Prefer app timestamp if saved, fallback to db creation
        })) || []);

        // Fetch inactive promoters
        const { data: inactiveData, error: inactiveError } = await supabase
          .from('inactive_promoters')
          .select('promoter_name');
        if (inactiveError) throw inactiveError;
        setInactivePromoters(new Set(inactiveData.map(i => i.promoter_name)) || new Set());

      } catch (fetchError) {
        console.error("Error fetching data from Supabase:", fetchError);
        setError(`Failed to load data: ${fetchError.message}. Check Supabase connection and RLS policies.`);
        // Clear potentially partial data on error
        setPromoters([]);
        setHistoryEntries([]);
        setInactivePromoters(new Set());
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Run only once on mount

  // Update OpenAI client on key change
  useEffect(() => {
    setOpenaiClient(initializeOpenAI(userApiKey, process.env.REACT_APP_OPENAI_API_KEY));
    if (!userApiKey && !process.env.REACT_APP_OPENAI_API_KEY) {
        setError(prev => prev ? prev : "OpenAI API Key is not configured. Please add it in Settings.");
    } else {
        setError(prev => prev.startsWith("OpenAI API Key is not configured") ? '' : prev);
    }
  }, [userApiKey]);

  // --- Helper: Generate Email API Call ---
  const generateEmailForPromoter = async (promoter) => {
    if (!openaiClient) {
      throw new Error("OpenAI client is not initialized. Check API key in Settings.");
    }

    // Construct the prompt (Placeholder - refine this significantly)
    const prompt = `
      Generate a brief, personalized outreach email introduction from 'Bossworks' to the company '${promoter.name}'.
      Mention their potential interest based on these KPI indicators (interpret them contextually):
      - MC/ET: ${promoter.mc_et ?? 'N/A'} (Value between 4.5-5.0 is ideal)
      - TMA Anteil: ${promoter.tma_anteil ?? 'N/A'}% (Above 75% is ideal)
      - VL Share: ${promoter.vl_share ?? 'N/A'}% (Above 10% is ideal)

      Keep the email concise and professional. Start with "Hello," and end before the sign-off.
      Subject line should be: CA KPIs
      
      Email Body:
    `;

    try {
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o", // Or the model specified in promoter.model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 150, // Adjust as needed
      });

      const emailContent = completion.choices[0]?.message?.content?.trim() || '';
      return emailContent;

    } catch (apiError) {
      console.error("OpenAI API Error for promoter:", promoter.id, apiError);
      // Extract more specific error message if available
      const errorMessage = apiError.response?.data?.error?.message || apiError.message || "Unknown API error";
      throw new Error(`API Error: ${errorMessage}`);
    }
  };

  // --- File Processing Logic --- 
  const processFile = async (file) => {
    if (!file) return;

    // Check file type
    const validTypes = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(fileExtension)) {
        setError('Invalid file type. Please upload an .xlsx or .xls file.');
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError('');
    setIsModalOpen(false); // Close modal once processing starts

    try {
      const data = await file.arrayBuffer(); // Use arrayBuffer for XLSX
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 });

      if (!jsonData || jsonData.length === 0) {
          throw new Error("Excel file appears to be empty or has no data rows.");
      }

      // Prepare data for Supabase insertion (match column names)
      const promotersToInsert = jsonData.map((row, index) => {
          if (!row || row[0] === undefined || row[1] === undefined) {
              console.warn(`Skipping row ${index + 2}: Missing Name or Email.`);
              return null;
          }
          const parseStat = (value) => {
              const num = parseFloat(value);
              return isNaN(num) ? null : num;
          };
          const parsePercentStat = (value) => {
              if (value === null || value === undefined) return null;
              if (typeof value === 'number') { return value > 1 ? value : value * 100; }
              if (typeof value === 'string') { const num = parseFloat(value.replace('%', '')); return isNaN(num) ? null : num; }
              return null;
          };
          return {
              // id will be generated by Supabase
              name: String(row[0]),
              email: String(row[1]),
              mc_et: parseStat(row[8]),
              tma_anteil: parsePercentStat(row[11]),
              vl_share: parsePercentStat(row[16]),
              // Default values for other columns
              generated_email: '', 
              subject: 'CA KPIs',
              model: 'GPT-4o', 
              is_marked_sent: false
          };
      }).filter(promoter => promoter !== null);

      if (promotersToInsert.length === 0) {
          throw new Error("No valid promoter data found in the Excel file.");
      }

      // Insert into Supabase
      const { data: insertedData, error: insertError } = await supabase
          .from('outreach_promoters')
          .insert(promotersToInsert)
          .select(); // Return the inserted rows

      if (insertError) throw insertError;

      // Update local state with the data returned from Supabase (including IDs)
      setPromoters(prev => [
          ...prev, 
          ...insertedData.map(p => ({ ...p, isMarkedSent: p.is_marked_sent }))
      ]);
      console.log(`Successfully imported and saved ${insertedData.length} promoters to Supabase.`);

    } catch (err) {
        console.error("Error processing/uploading Excel file:", err);
        setError(`Failed to import: ${err.message}`);
        // No need to clear promoters state here, keep existing if any
    } finally {
        setIsLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  // --- Event Handlers --- 
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setError(''); // Clear errors when closing modal manually
  };

  const handleGenerateEmail = useCallback(async (id) => {
    if (!openaiClient) {
        setError("OpenAI API Key not configured. Please add it in Settings.");
        return; 
    }
    const promoterIndex = promoters.findIndex(p => p.id === id);
    if (promoterIndex === -1) return;

    // Set loading state for this specific card
    setGeneratingIds(prev => new Set(prev).add(id));
    setError(''); // Clear previous errors

    try {
      const promoter = promoters[promoterIndex];
      const generatedEmailContent = await generateEmailForPromoter(promoter);
      
      // UPDATE in Supabase
      const { error: updateError } = await supabase
          .from('outreach_promoters')
          .update({ generated_email: generatedEmailContent })
          .eq('id', id);
      
      if (updateError) throw updateError;

      // Update local state
      setPromoters(prevPromoters => 
        prevPromoters.map(p => 
          p.id === id ? { ...p, generatedEmail: generatedEmailContent } : p
        )
      );
    } catch (err) {
      console.error("Error generating/updating email:", err);
      setError(`Failed for ${promoters[promoterIndex]?.name || 'promoter'}: ${err.message}`);
    } finally {
      // Remove loading state for this card
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [promoters, openaiClient]); // Keep dependencies

  // Generate All Emails - Refactored for Pause/Resume
  const handleGenerateAll = async () => {
    console.log(`[handleGenerateAll] Called. Status: ${generationStatus}`);
    if (generationStatus === 'running') {
        // Pause Request
        console.log("[handleGenerateAll] Pause generation requested.");
        stopGenerationRef.current = true; 
        setGenerationStatus('pausing'); // Add a temporary 'pausing' state for feedback
        return;
    }

    if (!openaiClient) {
        setError("OpenAI API Key not configured. Please add it in Settings.");
        return;
    }
    setError('');
    console.log("[handleGenerateAll] Setting status to 'running'.");
    setGenerationStatus('running');
    stopGenerationRef.current = false; 

    const startIndex = nextPromoterIndexRef.current;
    const promotersToGenerate = promoters.slice(startIndex).filter(p => !p.generatedEmail);

    if (promotersToGenerate.length === 0) {
        alert("All emails seem to be generated already.");
        setGenerationStatus('idle');
        setGeneratingIds(new Set());
        nextPromoterIndexRef.current = 0;
        return;
    }

    console.log(`[handleGenerateAll] Starting/Resuming generation for ${promotersToGenerate.length} emails from index ${startIndex}...`);
    let errorsEncountered = false;

    for (let i = 0; i < promotersToGenerate.length; i++) {
        console.log(`[handleGenerateAll] Loop iteration ${i}. Checking stop ref: ${stopGenerationRef.current}`); // Log loop state
        if (stopGenerationRef.current) {
            console.log("[handleGenerateAll] Stop ref is true. Pausing.");
            const originalIndex = promoters.findIndex(p => p.id === promotersToGenerate[i].id);
            nextPromoterIndexRef.current = originalIndex >= 0 ? originalIndex : 0;
            console.log(`[handleGenerateAll] Setting status to 'paused'. Next index: ${nextPromoterIndexRef.current}`);
            setGenerationStatus('paused');
            stopGenerationRef.current = false; 
            return; 
        }

        const promoter = promotersToGenerate[i];
        const currentId = promoter.id;
        console.log(`[handleGenerateAll] Generating for ${promoter.name} (ID: ${currentId})...`);
        setGeneratingIds(prev => new Set(prev).add(currentId));
        
        try {
            const generatedEmailContent = await generateEmailForPromoter(promoter);
            
            // Update in Supabase
            const { error: updateError } = await supabase
                .from('outreach_promoters')
                .update({ generated_email: generatedEmailContent })
                .eq('id', currentId);
            if (updateError) throw updateError;
            
            // Update local state immediately
            setPromoters(prevPromoters => 
                prevPromoters.map(p => 
                p.id === currentId ? { ...p, generatedEmail: generatedEmailContent } : p
                )
            );
            console.log(`[handleGenerateAll] Successfully generated for ${promoter.name}`);
        } catch (err) {
            console.error(`Failed for ${promoter.name}:`, err);
            setError(prevErr => prevErr ? `${prevErr}; Failed for ${promoter.name}` : `Failed for ${promoter.name}: ${err.message}`);
            errorsEncountered = true;
        } finally {
            // Remove loading state for the current card regardless of success/failure
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(currentId);
                return next;
            });
        }
    }

    console.log("[handleGenerateAll] Loop finished naturally.");
    setGenerationStatus('idle'); 
    setGeneratingIds(new Set()); 
    nextPromoterIndexRef.current = 0; 
    if (errorsEncountered) {
        alert("Some emails failed to generate. Check console/error messages.");
    }
  };

  const handleDeletePromoter = useCallback(async (id) => {
    // Optimistic UI update (optional but good UX)
    const originalPromoters = [...promoters];
    setPromoters(prevPromoters => prevPromoters.filter(p => p.id !== id));
    
    try {
        const { error } = await supabase
            .from('outreach_promoters')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (deleteError) {
        console.error("Failed to delete promoter from Supabase:", deleteError);
        setError(`Failed to delete: ${deleteError.message}`);
        // Revert UI if DB delete fails
        setPromoters(originalPromoters);
    }
  }, [promoters]);

  const handleUpdatePromoter = useCallback(async (id, updatedData) => {
    // Map internal state names to DB column names if needed
    const updatePayload = {
        ...updatedData,
        generated_email: updatedData.generatedEmail, // Example renaming
        // Remove fields not in the DB table if necessary
        generatedEmail: undefined, 
    };
    
    try {
        const { error } = await supabase
            .from('outreach_promoters')
            .update(updatePayload)
            .eq('id', id);
        if (error) throw error;

        // Update local state on successful DB update
        setPromoters(prevPromoters =>
            prevPromoters.map(p => (p.id === id ? { ...p, ...updatedData } : p))
        );
    } catch (updateError) {
        console.error("Failed to update promoter in Supabase:", updateError);
        setError(`Failed to save changes: ${updateError.message}`);
        // Optionally revert local state here
    }
  }, []);

  // Placeholder - Actual sending logic needed
  const handleSendEmail = useCallback((id) => {
    const promoter = promoters.find(p => p.id === id);
    if (promoter) {
         alert(`Simulating sending email to ${promoter.email} - Sending logic not implemented.`);
         // TODO: Implement actual email sending logic (e.g., API call)
    } else {
         alert("Promoter not found.");
    }
   
  }, [promoters]);

  // NEW: Handler to delete a specific history entry
  const handleDeleteHistoryEntry = useCallback(async (historyId) => {
    // Optimistic UI update
    const originalHistory = [...historyEntries];
    setHistoryEntries(prevHistory => prevHistory.filter(entry => entry.id !== historyId)); // Use 'id' from Supabase
    
    try {
         const { error } = await supabase
             .from('promoter_history')
             .delete()
             .eq('id', historyId);
         if (error) throw error;
    } catch (deleteError) {
         console.error("Failed to delete history entry:", deleteError);
         setError(`Failed to delete history: ${deleteError.message}`);
         setHistoryEntries(originalHistory); // Revert
    }
  }, [historyEntries]);

  // --- Drag and Drop Handlers --- 
  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    // Optional: Add visual feedback (e.g., add a class to the dropzone)
    e.dataTransfer.dropEffect = 'copy'; // Show a copy cursor
  };

  // This function is now passed as onFileProcess to the modal
  const handleProcessDroppedFile = (file) => {
      processFile(file);
  };

  // Settings Panel Handlers
  const handleOpenSettings = () => {
    console.log("Attempting to open settings..."); // Log handler call
    setIsSettingsOpen(true);
  };
  const handleCloseSettings = () => setIsSettingsOpen(false);
  const handleSaveApiKey = (newKey) => {
      setUserApiKey(newKey);
      localStorage.setItem('openaiApiKey', newKey); // Persist to localStorage
      console.log("API Key saved to localStorage.");
      // Client re-initialization is handled by the useEffect hook
  };

  // Log state before rendering panel
  console.log("Rendering App, isSettingsOpen:", isSettingsOpen);

  // Helper to determine Generate All button content
  const getGenerateAllButtonContent = () => {
      switch (generationStatus) {
          case 'running':
              return <><FiLoader className="button-icon spinner"/> Generating...</>; // Changed text
          case 'pausing': // Show pausing feedback
              return <><FiPauseCircle className="button-icon"/> Pausing...</>;
          case 'paused':
              return <><FiPlayCircle className="button-icon"/> Resume Generating</>;
          case 'idle':
          default:
              return <><FiZap className="button-icon"/> Generate All Emails</>;
      }
  };

  // Toggle the 'isMarkedSent' flag for a promoter in the main list
  const handleToggleMarkSent = useCallback(async (id) => {
    const promoter = promoters.find(p => p.id === id);
    if (!promoter) return;
    const newState = !promoter.isMarkedSent;

    try {
        const { error } = await supabase
            .from('outreach_promoters')
            .update({ is_marked_sent: newState })
            .eq('id', id);
        if (error) throw error;

        // Update local state
        setPromoters(prevPromoters =>
            prevPromoters.map(p => 
                p.id === id ? { ...p, isMarkedSent: newState } : p
            )
        );
    } catch (updateError) {
        console.error("Failed to toggle mark sent status:", updateError);
        setError(`Failed to update status: ${updateError.message}`);
    }
  }, [promoters]);

  // NEW: Save Sent Emails Handler
  const handleSaveSentEmails = async () => {
      const emailsToSave = promoters.filter(p => p.isMarkedSent && p.generatedEmail);
      if (emailsToSave.length === 0) {
          alert("No emails marked as 'Sent' to save.");
          return;
      }
  
      // Prepare data for history insertion
      const historyPayload = emailsToSave.map(p => ({
          name: p.name,
          email: p.email,
          mc_et: p.mc_et,
          tma_anteil: p.tma_anteil,
          vl_share: p.vl_share,
          generated_email: p.generatedEmail,
          subject: p.subject,
          model: p.model,
          app_saved_at: new Date().toISOString() // Record app save time
          // Supabase handles 'id' and 'created_at'
      }));
  
      const idsToDelete = emailsToSave.map(p => p.id);
  
      try {
          // Insert into history table
          const { data: insertedHistory, error: insertError } = await supabase
              .from('promoter_history')
              .insert(historyPayload)
              .select(); 
          if (insertError) throw insertError;
          
          // Delete from outreach table
          const { error: deleteError } = await supabase
              .from('outreach_promoters')
              .delete()
              .in('id', idsToDelete);
          if (deleteError) throw deleteError;
          
          // Update local state on full success
          setHistoryEntries(prev => [
              ...insertedHistory.map(h => ({ 
                  ...h, 
                  generatedEmail: h.generated_email, 
                  historyId: h.id, 
                  savedAt: h.app_saved_at || h.created_at
              })), 
              ...prev
          ].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))); // Ensure sorted
          
          setPromoters(prev => prev.filter(p => !idsToDelete.includes(p.id)));

          // Keep success alert
          // alert(`Saved ${emailsToSave.length} emails to history.`);
  
      } catch (dbError) {
          console.error("Error saving emails to history:", dbError);
          setError(`Failed to save to history: ${dbError.message}`);
          // Consider how to handle partial success (e.g., inserted but not deleted)
      }
  };

  // --- Filtering Logic for History --- 
  const uniquePromoterNames = Array.from(new Set(historyEntries.map(entry => entry.name))).sort();
  
  // Separate active and inactive promoters
  const activePromoterNames = uniquePromoterNames.filter(name => !inactivePromoters.has(name));
  const inactivePromoterNames = uniquePromoterNames.filter(name => inactivePromoters.has(name));

  // Format options for react-select with grouping
  const promoterFilterOptions = [
    { value: 'All', label: 'All Promoters' }, // Keep All ungrouped at top
    // Only add Active group if there are active promoters
    ...(activePromoterNames.length > 0 ? 
      [{ label: 'Active', options: activePromoterNames.map(name => ({ value: name, label: name })) }] : 
      []
    ),
    // Only add Inactive group if there are inactive promoters
    ...(inactivePromoterNames.length > 0 ? 
      [{ label: 'Inactive', options: inactivePromoterNames.map(name => ({ value: name, label: name, isInactive: true })) }] : // Add flag for styling
      []
    )
  ];
  
  // Find the currently selected option object for react-select value prop
  // Need to search within groups if necessary
  const findOption = (options, value) => {
    for (const item of options) {
        if (item.options) { // It's a group
            const foundInGroup = item.options.find(opt => opt.value === value);
            if (foundInGroup) return foundInGroup;
        } else { // It's a direct option (like 'All')
            if (item.value === value) return item;
        }
    }
    return null; // Not found
  };
  const selectedFilterOption = findOption(promoterFilterOptions, historyFilter) || promoterFilterOptions[0];

  const filteredHistory = historyEntries.filter(entry => 
     historyFilter === 'All' || entry.name === historyFilter
  ).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)); // Sort newest first

  // Helper function to group history entries by date
  const groupHistoryByDate = (history) => {
    const grouped = {};
    history.forEach(entry => {
        if (!entry.savedAt) return; // Skip if savedAt is missing
        const date = new Date(entry.savedAt);
        const displayDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (!grouped[displayDate]) {
            grouped[displayDate] = [];
        }
        grouped[displayDate].push(entry);
    });
    // Dates are implicitly sorted because the input `history` is sorted newest first
    return grouped; 
  };

  const groupedHistory = groupHistoryByDate(filteredHistory);
  const historyDates = Object.keys(groupedHistory); // Get the dates for rendering headers

  // Custom styles for react-select to match the theme
  const selectStyles = {
    control: (provided, state) => ({
      ...provided,
      minWidth: 200,
      fontSize: '0.9rem',
      borderColor: state.isFocused ? '#86b7fe' : '#ced4da',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#86b7fe' : '#adb5bd',
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : 'white',
      color: state.isSelected ? 'white' : '#212529',
      fontSize: '0.9rem',
      // Apply styles for inactive options
      opacity: state.data.isInactive ? 0.6 : 1,
      fontStyle: state.data.isInactive ? 'italic' : 'normal',
      cursor: state.data.isInactive ? 'default' : 'pointer', // Optional: change cursor
      '&:active': {
        backgroundColor: state.isSelected ? '#0b5ed7' : state.isFocused ? '#dee2e6' : '#f8f9fa' // Adjust active background slightly
      },
    }),
    groupHeading: (provided) => ({
      ...provided,
      color: '#6c757d', // Style group heading text
      fontSize: '0.8rem', // Smaller font for group heading
      fontWeight: '600',
      textTransform: 'uppercase',
      paddingTop: '8px',
      paddingBottom: '4px',
      borderTop: '1px solid #dee2e6', // Separator above group
      marginTop: '4px',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#212529',
      fontSize: '0.9rem',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '0.9rem',
    }),
    menu: (provided) => ({
      ...provided,
      fontSize: '0.9rem',
    })
  };

  // NEW: Handlers for marking promoters active/inactive
  const handleMarkInactive = useCallback(async (promoterName) => {
    if (!promoterName || promoterName === 'All') return;
    try {
        // Insert into inactive_promoters table
        const { error } = await supabase
            .from('inactive_promoters')
            .insert({ promoter_name: promoterName }); 
            // Supabase handles potential duplicates if UNIQUE constraint exists
            // Or use upsert if needed: .upsert({ promoter_name: promoterName })
        
        if (error && error.code !== '23505') { // Ignore unique violation errors
          throw error;
        }
        // Update local state
        setInactivePromoters(prev => new Set(prev).add(promoterName));
    } catch (dbError) {
        console.error("Failed to mark promoter inactive:", dbError);
        setError(`Failed to update status: ${dbError.message}`);
    }
  }, []);

  const handleMarkActive = useCallback(async (promoterName) => {
    if (!promoterName || promoterName === 'All') return;
    try {
          const { error } = await supabase
              .from('inactive_promoters')
              .delete()
              .eq('promoter_name', promoterName);
          if (error) throw error;

          // Update local state
          setInactivePromoters(prev => {
              const next = new Set(prev);
              next.delete(promoterName);
              return next;
          });
    } catch (dbError) {
          console.error("Failed to mark promoter active:", dbError);
          setError(`Failed to update status: ${dbError.message}`);
    }
  }, []);

  return (
    <div className="App">
      {/* Render Modal */} 
      <ImportModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onFileProcess={handleProcessDroppedFile}
          onDragOver={handleDragOver} // Pass drag over for internal styling
      />
      {/* Settings Panel */} 
      <SettingsPanel 
          isOpen={isSettingsOpen}
          onClose={handleCloseSettings}
          onSave={handleSaveApiKey}
          initialApiKey={userApiKey} // Pass current key to initialize input
      />

      <header className="app-header">
        {/* Dynamically set the header text based on currentPage */}
        <h1>{currentPage === 'outreach' ? 'CA KPI Outreach' : 'CA KPI History'}</h1>
        <div className="header-controls">
          <nav className="main-nav">
            <button 
              className={`nav-button ${currentPage === 'outreach' ? 'active' : ''}`}
              onClick={() => setCurrentPage('outreach')}
            >
              <FiOutreach /> Outreach
            </button>
            <button 
              className={`nav-button ${currentPage === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentPage('history')}
            >
              <FiDatabase /> History ({historyEntries.length})
            </button>
          </nav>
          <div className="header-actions">
            <button className="button-primary" onClick={handleOpenModal} title="Import Excel"> 
              <FiUpload className="button-icon"/> <span>Import</span>
            </button>
            <button 
              className={`button-tertiary ${generationStatus === 'running' ? 'generating' : ''}`}
              onClick={handleGenerateAll}
              disabled={generationStatus === 'pausing' || promoters.filter(p => !p.generatedEmail).length === 0}
            >
              {getGenerateAllButtonContent()}
            </button>
            <button className="button-secondary settings-button" onClick={handleOpenSettings} title="Settings"> 
              <FiSettings className="button-icon"/>
            </button>
          </div>
        </div>
      </header>

      <main>
        {error && <p className="error-message">⚠️ {error}</p>} 
        {isLoading && currentPage === 'outreach' && <p>Loading...</p>} 

        {currentPage === 'outreach' && (
          <>
            {promoters.length > 0 ? (
              <div className="card-list">
                {promoters.map((promoter) => (
                  <PromoterCard
                    key={promoter.id}
                    promoter={promoter}
                    isGenerating={generatingIds.has(promoter.id)}
                    isReadOnly={false}
                    isMarkedSent={promoter.isMarkedSent}
                    onDelete={handleDeletePromoter}
                    onUpdate={handleUpdatePromoter}
                    onRegenerate={handleGenerateEmail}
                    onToggleMarkSent={handleToggleMarkSent}
                  />
                ))}
              </div>
            ) : (
              // Render message in its own container when empty
              !isLoading && 
              <div className="empty-outreach-message-container">
                <p className="info-message">Import an Excel file to get started.</p>
              </div>
            )}
            
            {promoters.some(p => p.isMarkedSent) && (
              <div className="save-button-container">
                <button className="button-primary save-emails-button" onClick={handleSaveSentEmails}>
                  <FiSave /> Save Sent Emails to History
                </button>
              </div>
            )}
          </>
        )}

        {currentPage === 'history' && (
          <div className="history-view">
            {/* Add the new Stats component */} 
            <HistoryStats 
              historyEntries={historyEntries} 
              selectedPromoter={historyFilter} // Pass the filter value
            />

            <div className="history-controls">
              {/* Wrap label, select, and span for centering */}
              <div className="history-filter-group">
                <label htmlFor="historyFilterSelect">Filter by Promoter:</label>
                <Select
                  inputId="historyFilterSelect"
                  options={promoterFilterOptions}
                  value={selectedFilterOption}
                  onChange={(selectedOption) => setHistoryFilter(selectedOption ? selectedOption.value : 'All')}
                  styles={selectStyles}
                  classNamePrefix="react-select"
                />
                <span>({filteredHistory.length} entries found)</span>
              </div>

              {/* Remove Spacer */}
              {/* <div style={{ flexGrow: 1 }}></div> */}

              {/* Conditional button for Mark Active/Inactive */}
              {historyFilter !== 'All' && (
                !inactivePromoters.has(historyFilter) ? (
                  <button 
                    className="button-secondary mark-inactive-button" 
                    onClick={() => handleMarkInactive(historyFilter)}
                    title={`Mark ${historyFilter} as inactive`}
                  >
                    Mark Inactive
                  </button>
                ) : (
                  <button 
                    className="button-success mark-active-button" 
                    onClick={() => handleMarkActive(historyFilter)}
                    title={`Mark ${historyFilter} as active`}
                  >
                    Mark Active
                  </button>
                )
              )}
            </div>
            <div className="card-list history-list">
              {filteredHistory.length > 0 ? (
                historyDates.map(date => (
                  <React.Fragment key={date}>
                    <h4 className="history-date-header">{date}</h4>
                    {groupedHistory[date].map(entry => (
                      <PromoterCard
                        key={entry.historyId} // Use the unique historyId
                        promoter={entry}
                        isGenerating={false}
                        isReadOnly={true}
                        isMarkedSent={true} // History items were marked sent
                        onDelete={handleDeleteHistoryEntry} // Use the new handler
                        onUpdate={() => {}} // No updates on history
                        onRegenerate={() => {}} // No regenerate on history
                        onToggleMarkSent={() => {}} // No toggle on history
                      />
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <p className="info-message">No history entries found{historyFilter !== 'All' ? ` for ${historyFilter}` : ''}.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 