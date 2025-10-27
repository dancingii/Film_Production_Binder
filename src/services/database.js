// /services/database.js
// Database service layer for Film Production App
// Handles all Supabase database operations for load/sync

import { supabase } from "../supabase";

// ============================================================================
// DATABASE LOAD FUNCTIONS
// ============================================================================

export const loadScenesFromDatabase = async (
  selectedProject,
  setScenes,
  setScenesLoaded,
  loadStripboardScenesCallback
) => {
  try {
    const { data, error } = await supabase
      .from("scenes")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedScenes = (data || []).map((scene) => ({
      sceneNumber: scene.scene_number,
      heading: scene.heading,
      content: scene.content || [],
      metadata: scene.metadata || {},
      pageNumber: scene.page_number,
      pageLength: scene.page_length,
      estimatedDuration: scene.estimated_duration || "30 min",
      status: scene.status || "Not Scheduled",
      manualTimeOfDay: scene.manual_time_of_day || null,
      description: scene.description || null,
      notes: scene.notes || null,
    }));

    // Simple numerical sort
    formattedScenes.sort((a, b) => {
      const aNum = parseInt(String(a.sceneNumber)) || 0;
      const bNum = parseInt(String(b.sceneNumber)) || 0;
      return aNum - bNum;
    });

    console.log("Setting scenes:", formattedScenes.length, "scenes loaded");
    setScenes(formattedScenes);
    setScenesLoaded(true);

    // Load stripboard scenes after main scenes are loaded
    if (loadStripboardScenesCallback) {
      loadStripboardScenesCallback(formattedScenes);
    }
  } catch (error) {
    console.error("Error loading scenes:", error);
    setScenesLoaded(true);
  }
};

export const loadStripboardScenesAfterScenes = async (
  selectedProject,
  loadedScenes,
  setStripboardScenes
) => {
  try {
    const { data, error } = await supabase
      .from("stripboard_scenes")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    if (data && data.length > 0) {
      const mergedStripboardScenes = loadedScenes.map((scene) => {
        const stripboardScene = data.find(
          (s) => s.scene_number == scene.sceneNumber
        );
        return {
          ...scene,
          status: stripboardScene?.status || scene.status,
          scheduledDate: stripboardScene?.scheduled_date || null,
          scheduledTime: stripboardScene?.scheduled_time || null,
        };
      });

      setStripboardScenes(mergedStripboardScenes);
      console.log(
        "✅ Loaded stripboard scenes AFTER main scenes:",
        data.length
      );
    } else {
      setStripboardScenes([...loadedScenes]);
      console.log("No stripboard scenes found, using main scenes as fallback");
    }
  } catch (error) {
    console.error("Error loading stripboard scenes:", error);
    setStripboardScenes([...loadedScenes]);
  }
};

export const loadCastCrewFromDatabase = async (
  selectedProject,
  setCastCrew
) => {
  try {
    console.log("Loading cast/crew from database...");
    const { data, error } = await supabase
      .from("cast_crew")
      .select("*")
      .eq("project_id", selectedProject.id)
      .order("person_id", { ascending: true });

    if (error) throw error;

    const formattedCastCrew = (data || []).map((person) => {
      const contactInfo = person.contact_info || {};
      const availability = person.availability || {};

      return {
        id: person.person_id || `person_${Date.now()}_${Math.random()}`, // ✅ USE SAVED ID
        user_id: person.user_id || null, // ✅ LOAD THE USER_ID FOR ACCOUNT LINKING
        photoUrl: person.photo_url || null,
        displayName: person.name,
        position: person.role || "",
        type: person.type || "crew",
        character: person.type === "cast" ? person.role : "",
        crewDepartment: person.department || "",
        email: contactInfo.email || "",
        phone: contactInfo.phone || "",
        height: "",
        weight: "",
        emergencyContact: contactInfo.emergencyContact || {},
        wardrobe: contactInfo.wardrobe || {},
        dietary: contactInfo.dietary || {},
        unionStatus: availability.unionStatus || "Non-Union",
        unionNumber: "",
        unavailableDates: availability.unavailableDates || [],
        availableDates: availability.availableDates || [],
        bookedDates: availability.bookedDates || [],
        notes: availability.notes || "",
      };
    });

    setCastCrew(formattedCastCrew);
    console.log("Cast/Crew loaded:", formattedCastCrew.length);
  } catch (error) {
    console.error("Error loading cast/crew:", error);
  }
};

export const loadTaggedItemsFromDatabase = async (
  selectedProject,
  setTaggedItems,
  calculateCategoryNumbers
) => {
  try {
    const { data, error } = await supabase
      .from("tagged_items")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedTaggedItems = {};
    (data || []).forEach((item) => {
      formattedTaggedItems[item.word] = {
        displayName: item.display_name,
        customTitle: item.custom_title,
        category: item.category,
        color: item.color,
        chronologicalNumber: item.chronological_number,
        position: item.position,
        scenes: item.scenes || [],
        instances: item.instances || [],
        assignedCharacters: item.assigned_characters || [],
        manuallyCreated: item.manually_created || false,
        originalProp: item.original_prop,
      };
    });

    const itemsWithCategoryNumbers =
      calculateCategoryNumbers(formattedTaggedItems);
    setTaggedItems(itemsWithCategoryNumbers);
    console.log(
      "Loaded tagged items from database:",
      Object.keys(itemsWithCategoryNumbers).length
    );
  } catch (error) {
    console.error("Error loading tagged items:", error);
  }
};

export const loadProjectSettingsFromDatabase = async (
  selectedProject,
  setProjectSettings,
  setCharacterSceneOverrides
) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", selectedProject.id)
      .single();

    if (error) throw error;

    if (data && data.settings) {
      setProjectSettings({
        filmTitle: data.name || "",
        producer: data.producer || "",
        director: data.director || "",
        ...data.settings,
      });
      console.log("Loaded project settings from database");
    }

    if (data && data.character_overrides) {
      setCharacterSceneOverrides(data.character_overrides);
      console.log("Loaded character overrides from database");
    }
  } catch (error) {
    console.error("Error loading project settings:", error);
  }
};

export const loadShootingDaysFromDatabase = async (
  selectedProject,
  setShootingDays
) => {
  try {
    const { data, error } = await supabase
      .from("shooting_days")
      .select("*")
      .eq("project_id", selectedProject.id)
      .order("day_number");

    if (error) throw error;

    const formattedShootingDays = (data || []).map((day) => ({
      id: day.day_id,
      date: day.date,
      dayNumber: day.day_number,
      scheduleBlocks: day.schedule_blocks || [],
      isLocked: day.is_locked || false,
      isShot: day.is_shot || false,
      isCollapsed: day.is_collapsed || false,
    }));

    setShootingDays(formattedShootingDays);
    console.log(
      "Loaded shooting days from database:",
      formattedShootingDays.length
    );
  } catch (error) {
    console.error("Error loading shooting days:", error);
  }
};

export const loadCharactersFromDatabase = async (
  selectedProject,
  setCharacters
) => {
  try {
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedCharacters = {};
    (data || []).forEach((character) => {
      formattedCharacters[character.name] = {
        name: character.name,
        scenes: character.scenes || [],
        chronologicalNumber: character.chronological_number || 1,
      };
    });

    setCharacters(formattedCharacters);
    console.log("Characters loaded:", Object.keys(formattedCharacters).length);
  } catch (error) {
    console.error("Error loading characters:", error);
  }
};

export const loadActualLocationsFromDatabase = async (
  selectedProject,
  setActualLocations
) => {
  try {
    const { data, error } = await supabase
      .from("actual_locations")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedLocations = (data || []).map((location) => ({
      id: location.location_id,
      name: location.name || "",
      address: location.address || "",
      contactPerson: location.contact_person || "",
      phone: location.phone || "",
      category: location.category || "",
      permitRequired: location.permit_required || false,
      parkingInfo: location.parking_info || "",
      notes: location.notes || "",
      city: location.city || "",
      state: location.state || "",
      zipCode: location.zip_code || "",
    }));

    setActualLocations(formattedLocations);
    console.log(
      "Loaded actual locations from database:",
      formattedLocations.length
    );
  } catch (error) {
    console.error("Error loading actual locations:", error);
  }
};

export const loadScriptLocationsFromDatabase = async (
  selectedProject,
  setScriptLocations
) => {
  try {
    const { data, error } = await supabase
      .from("script_locations")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedScriptLocations = (data || []).map((location) => ({
      id: location.location_id,
      parentLocation: location.parent_location || "",
      subLocation: location.sub_location || "",
      fullName: location.full_name || "",
      intExt: location.int_ext || "",
      scenes: location.scenes || [],
      actualLocationId: location.actual_location_id || null,
      category: location.category || "",
    }));

    setScriptLocations(formattedScriptLocations);
    console.log(
      "Loaded script locations from database:",
      formattedScriptLocations.length
    );
  } catch (error) {
    console.error("Error loading script locations:", error);
  }
};

export const loadCallSheetDataFromDatabase = async (
  selectedProject,
  setCallSheetData
) => {
  try {
    const { data, error } = await supabase
      .from("call_sheet_data")
      .select("*")
      .eq("project_id", selectedProject.id)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      setCallSheetData({
        callTime: data.call_time || "7:30 AM",
        castCallTimes: data.cast_call_times || {},
        customNotes: data.custom_notes || {},
        crewByDay: data.crew_by_day || {},
        tableSizesByDay: data.table_sizes_by_day || {},
        callTimeByDay: data.call_time_by_day || {},
        notesByDay: data.notes_by_day || {},
        crewCallTimes: data.crew_call_times || {},
        hiddenCastByDay: data.hidden_cast_by_day || {},
      });
      console.log("Loaded call sheet data from database");
    }
  } catch (error) {
    console.error("Error loading call sheet data:", error);
  }
};

export const loadWardrobeItemsFromDatabase = async (
  selectedProject,
  setWardrobeItems
) => {
  try {
    const { data, error } = await supabase
      .from("wardrobe_items")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedWardrobe = (data || []).map((item) => item.item_data);
    setWardrobeItems(formattedWardrobe);
    console.log(
      "Loaded wardrobe items from database:",
      formattedWardrobe.length
    );
  } catch (error) {
    console.error("Error loading wardrobe items:", error);
  }
};

export const loadGarmentInventoryFromDatabase = async (
  selectedProject,
  setGarmentInventory
) => {
  try {
    const { data, error } = await supabase
      .from("garment_inventory")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedGarments = (data || []).map((item) => item.garment_data);
    setGarmentInventory(formattedGarments);
    console.log(
      "Loaded garment inventory from database:",
      formattedGarments.length
    );
  } catch (error) {
    console.error("Error loading garment inventory:", error);
  }
};

export const loadCostCategoriesFromDatabase = async (
  selectedProject,
  setCostCategories
) => {
  try {
    const { data, error } = await supabase
      .from("cost_categories")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedCategories = (data || []).map((category) => ({
      id: category.category_id,
      name: category.name,
      color: category.color,
      expenses: category.expenses || [],
      budget: category.budget || 0,
    }));

    setCostCategories(formattedCategories);
    console.log(
      "Loaded cost categories from database:",
      formattedCategories.length
    );
  } catch (error) {
    console.error("Error loading cost categories:", error);
  }
};

export const loadCostVendorsFromDatabase = async (
  selectedProject,
  setCostVendors
) => {
  try {
    const { data, error } = await supabase
      .from("cost_vendors")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const vendorNames = (data || []).map((vendor) => vendor.vendor_name);
    setCostVendors(vendorNames);
    console.log("Loaded cost vendors from database:", vendorNames.length);
  } catch (error) {
    console.error("Error loading cost vendors:", error);
  }
};

export const loadBudgetDataFromDatabase = async (
  selectedProject,
  setBudgetData
) => {
  try {
    const { data, error } = await supabase
      .from("budget_data")
      .select("*")
      .eq("project_id", selectedProject.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      setBudgetData({
        projectInfo: data.project_info || {},
        atlItems: data.atl_items || [],
        btlItems: data.btl_items || [],
        legalItems: data.legal_items || [],
        marketingItems: data.marketing_items || [],
        postItems: data.post_items || [],
        contingencySettings: data.contingency_settings || {
          percentage: 10,
          includeATL: true,
          includeBTL: true,
          includeLegal: true,
          includeMarketing: false,
          includePost: false,
        },
        departmentBudgets: data.department_budgets || {},
        weeklyReports: data.weekly_reports || [],
        customCategories: data.custom_categories || [],
        totals: data.totals || {
          atlTotal: 0,
          btlTotal: 0,
          grandTotal: 0,
          paidTotal: 0,
          unpaidTotal: 0,
        },
      });
      console.log("Loaded budget data from database");
    }
  } catch (error) {
    console.error("Error loading budget data:", error);
  }
};

export const loadTodoItemsFromDatabase = async (
  selectedProject,
  setTodoItems
) => {
  try {
    const { data, error } = await supabase
      .from("todo_items")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedTodos = (data || []).map((item) => item.item_data);
    setTodoItems(formattedTodos);
    console.log("Loaded todo items from database:", formattedTodos.length);
  } catch (error) {
    console.error("Error loading todo items:", error);
  }
};

export const loadShotListDataFromDatabase = async (
  selectedProject,
  setShotListData,
  setSceneNotes
) => {
  try {
    const { data, error } = await supabase
      .from("shot_list_data")
      .select("*")
      .eq("project_id", selectedProject.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      setShotListData(data.shot_list_data || {});
      setSceneNotes(data.scene_notes || {});
      console.log("Loaded shot list data from database");
    }
  } catch (error) {
    console.error("Error loading shot list data:", error);
  }
};

export const loadScheduledScenesFromDatabase = async (
  selectedProject,
  setScheduledScenes
) => {
  try {
    const { data, error } = await supabase
      .from("scheduled_scenes")
      .select("*")
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const formattedScheduled = {};
    (data || []).forEach((mapping) => {
      formattedScheduled[mapping.shoot_date] = mapping.scenes || [];
    });

    setScheduledScenes(formattedScheduled);
    console.log(
      "Loaded scheduled scenes from database:",
      Object.keys(formattedScheduled).length,
      "dates"
    );
  } catch (error) {
    console.error("Error loading scheduled scenes:", error);
  }
};

export const loadTimelineDataFromDatabase = async (
  selectedProject,
  setTimelineData
) => {
  try {
    const { data, error } = await supabase
      .from("timeline_data")
      .select("*")
      .eq("project_id", selectedProject.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data && data.timeline_data) {
      setTimelineData(data.timeline_data);
      console.log("Loaded timeline data from database");
    }
  } catch (error) {
    console.error("Error loading timeline data:", error);
  }
};

export const loadContinuityElementsFromDatabase = async (
  selectedProject,
  setContinuityElements
) => {
  try {
    const { data, error } = await supabase
      .from("continuity_elements")
      .select("*")
      .eq("project_id", selectedProject.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data && data.continuity_elements) {
      setContinuityElements(data.continuity_elements);
      console.log("Loaded continuity elements from database");
    }
  } catch (error) {
    console.error("Error loading continuity elements:", error);
  }
};

// ============================================================================
// DATABASE SYNC FUNCTIONS
// ============================================================================

export const saveScenesDatabase = async (
  selectedProject,
  updatedScenes,
  scenesLoaded,
  isSavingScenes,
  setIsSavingScenes
) => {
  if (!selectedProject || !scenesLoaded || isSavingScenes) return;

  setIsSavingScenes(true);

  try {
    console.log(
      "🔄 Saving scenes to database:",
      updatedScenes.length,
      "scenes"
    );

    const scenesData = updatedScenes.map((scene) => ({
      project_id: selectedProject.id,
      scene_number: scene.sceneNumber,
      heading: scene.heading,
      content: scene.content || [],
      metadata: scene.metadata || {},
      page_number: scene.pageNumber,
      page_length: scene.pageLength,
      estimated_duration: scene.estimatedDuration || "30 min",
      status: scene.status || "Not Scheduled",
      manual_time_of_day: scene.manualTimeOfDay || null,
      description: scene.description || null,
      notes: scene.notes || null,
    }));

    // Delete-and-insert pattern to prevent duplicates
    const { error: deleteError } = await supabase
      .from("scenes")
      .delete()
      .eq("project_id", selectedProject.id);

    if (deleteError) throw deleteError;

    await new Promise((resolve) => setTimeout(resolve, 100));

    const { error: insertError } = await supabase
      .from("scenes")
      .insert(scenesData);

    if (insertError) throw insertError;

    console.log("✅ Scenes saved successfully to database");
  } catch (error) {
    console.error("❌ Critical error saving scenes:", error);
    alert(
      `Database save failed: ${error.message}. Your changes may not persist.`
    );
  } finally {
    setIsSavingScenes(false);
  }
};

export const syncStripboardScenesToDatabase = async (
  selectedProject,
  updatedStripboardScenes
) => {
  if (!selectedProject || !updatedStripboardScenes) return;

  try {
    console.log("Syncing stripboard scenes to database...");

    const stripboardScenesData = updatedStripboardScenes.map((scene) => ({
      project_id: selectedProject.id,
      scene_number: scene.sceneNumber,
      status: scene.status || "Not Scheduled",
      scheduled_date: scene.scheduledDate || null,
      scheduled_time: scene.scheduledTime || null,
    }));

    await supabase
      .from("stripboard_scenes")
      .delete()
      .eq("project_id", selectedProject.id);

    const { error } = await supabase
      .from("stripboard_scenes")
      .insert(stripboardScenesData);

    if (error) throw error;

    console.log("Stripboard scenes synced to database successfully");
  } catch (error) {
    console.error("Error syncing stripboard scenes:", error);
  }
};

export const syncScheduledScenesToDatabase = async (
  selectedProject,
  updatedScheduledScenes
) => {
  if (!selectedProject || !updatedScheduledScenes) return;

  try {
    console.log("Syncing scheduled scenes to database...");

    const scheduledScenesData = Object.entries(updatedScheduledScenes).map(
      ([date, scenes]) => ({
        project_id: selectedProject.id,
        shoot_date: date,
        scenes: scenes || [],
      })
    );

    await supabase
      .from("scheduled_scenes")
      .delete()
      .eq("project_id", selectedProject.id);

    if (scheduledScenesData.length > 0) {
      const { error } = await supabase
        .from("scheduled_scenes")
        .insert(scheduledScenesData);

      if (error) throw error;
    }

    console.log("Scheduled scenes synced to database successfully");
  } catch (error) {
    console.error("Error syncing scheduled scenes:", error);
  }
};

export const syncScriptLocationsToDatabase = async (
  selectedProject,
  updatedLocations
) => {
  if (!selectedProject || !updatedLocations) return;

  // Empty data protection
  if (!Array.isArray(updatedLocations) || updatedLocations.length === 0) {
    console.warn("⚠️ SYNC BLOCKED: Empty script locations array");
    return;
  }

  try {
    console.log("🔄 Syncing Script Locations to database (ATOMIC)...");

    const locationsData = updatedLocations
      .filter((loc) => loc && loc.id)
      .map((loc) => ({
        project_id: selectedProject.id,
        location_id: loc.id,
        parent_location: loc.parentLocation,
        sub_location: loc.subLocation,
        full_name: loc.fullName,
        int_ext: loc.intExt,
        scenes: loc.scenes || [],
        actual_location_id: loc.actualLocationId || null,
        category: loc.category || "unassigned",
      }));

    // Second check after filter
    if (locationsData.length === 0) {
      console.warn("⚠️ SYNC BLOCKED: All script locations filtered out");
      return;
    }

    // Use atomic RPC function
    const { error } = await supabase.rpc("sync_script_locations", {
      p_project_id: selectedProject.id,
      p_locations_data: locationsData,
    });

    if (error) throw error;

    console.log("✅ Script Locations synced successfully (ATOMIC)");
  } catch (error) {
    console.error("❌ Error syncing Script Locations:", error);
  }
};

export const syncActualLocationsToDatabase = async (
  selectedProject,
  updatedLocations
) => {
  if (!selectedProject || !updatedLocations) return;

  // Empty data protection
  if (!Array.isArray(updatedLocations) || updatedLocations.length === 0) {
    console.warn("⚠️ SYNC BLOCKED: Empty actual locations array");
    return;
  }

  try {
    console.log("🔄 Syncing Actual Locations to database (ATOMIC)...");

    const locationsData = updatedLocations
      .filter((loc) => loc && loc.id)
      .map((loc) => ({
        project_id: selectedProject.id,
        location_id: loc.id,
        name: loc.name,
        address: loc.address || "",
        city: loc.city || "",
        state: loc.state || "",
        zip_code: loc.zipCode || "",
        contact_person: loc.contactPerson || "",
        phone: loc.phone || "",
        category: loc.category || "practical",
        permit_required: loc.permitRequired || false,
        parking_info: loc.parkingInfo || "",
        notes: loc.notes || "",
      }));

    // Second check after filter
    if (locationsData.length === 0) {
      console.warn("⚠️ SYNC BLOCKED: All actual locations filtered out");
      return;
    }

    // Use atomic RPC function
    const { error } = await supabase.rpc("sync_actual_locations", {
      p_project_id: selectedProject.id,
      p_locations_data: locationsData,
    });

    if (error) throw error;

    console.log("✅ Actual Locations synced successfully (ATOMIC)");
  } catch (error) {
    console.error("❌ Error syncing Actual Locations:", error);
  }
};

export const syncCastCrewToDatabase = async (
  selectedProject,
  updatedCastCrew
) => {
  if (!selectedProject || !updatedCastCrew) return;

  // ✅ FORENSIC LOGGING
  const timestamp = new Date().toISOString();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 CAST/CREW SYNC CALLED");
  console.log("Timestamp:", timestamp);
  console.log("Input array length:", updatedCastCrew.length);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ STEP 1: Check if incoming data is empty
  if (!Array.isArray(updatedCastCrew) || updatedCastCrew.length === 0) {
    console.warn("⚠️ EMPTY ARRAY DETECTED - Verifying against database...");

    // Check what's currently in the database
    const { data: existingData, error: checkError } = await supabase
      .from("cast_crew")
      .select("person_id", { count: "exact" })
      .eq("project_id", selectedProject.id);

    if (checkError) {
      console.error("❌ Database check failed:", checkError);
      return;
    }

    const dbCount = existingData?.length || 0;
    console.log(`📊 Database has ${dbCount} cast/crew records`);

    if (dbCount > 0) {
      // Database has data but local state is empty - this is CORRUPTION
      console.error(
        "❌ SYNC ABORTED: Database has data but local state is empty!"
      );
      console.error(
        "🛡️ DATA LOSS PREVENTED - This was likely a corrupted state"
      );
      console.error(
        "Recommendation: Reload the page to get fresh data from database"
      );

      // Show alert to user
      alert(
        "⚠️ SYNC BLOCKED: Your local data appears corrupted (empty when it shouldn't be).\n\n" +
          "Please refresh the page to reload from the database.\n\n" +
          "This message prevented accidental data deletion."
      );
      return;
    } else {
      // Database is already empty, so syncing empty is legitimate
      console.log("✅ Database is already empty - sync allowed");
      // Allow the sync to proceed (nothing will change anyway)
      return;
    }
  }

  try {
    console.log("Syncing Cast/Crew data to database...");

    const castCrewData = updatedCastCrew
      .filter(
        (person) =>
          person && person.displayName && person.displayName.trim() !== ""
      )
      .map((person) => ({
        project_id: selectedProject.id,
        person_id: person.id,
        user_id: person.user_id || null,
        photo_url: person.photoUrl || null,
        name: person.displayName.trim(),
        role: person.type === "cast" ? person.character : person.position,
        department: person.crewDepartment || "",
        type: person.type || "crew",
        contact_info: {
          email: person.email || "",
          phone: person.phone || "",
          emergencyContact: person.emergencyContact || {},
          wardrobe: person.wardrobe || {},
          dietary: person.dietary || {},
        },
        availability: {
          unavailableDates: person.unavailableDates || [],
          availableDates: person.availableDates || [],
          bookedDates: person.bookedDates || [],
          unionStatus: person.unionStatus || "",
          notes: person.notes || "",
        },
      }));

    // ✅ STEP 2: Check AFTER filter (all names were empty/placeholder)
    if (castCrewData.length === 0) {
      console.warn(
        "⚠️ All cast/crew filtered out (empty names) - Verifying against database..."
      );

      const { data: existingData, error: checkError } = await supabase
        .from("cast_crew")
        .select("person_id", { count: "exact" })
        .eq("project_id", selectedProject.id);

      if (checkError) {
        console.error("❌ Database check failed:", checkError);
        return;
      }

      const dbCount = existingData?.length || 0;

      if (dbCount > 0) {
        console.error(
          "❌ SYNC ABORTED: Would delete all data due to empty names!"
        );
        console.error("🛡️ DATA LOSS PREVENTED");
        alert(
          "⚠️ SYNC BLOCKED: All cast/crew members have empty names.\n\n" +
            "This would delete all existing data.\n\n" +
            "Please ensure all people have valid names before saving."
        );
        return;
      }
    }

    // ✅ Safe to proceed - use atomic RPC function to prevent race conditions
    console.log("🔄 Using atomic RPC function for sync...");

    const { error: rpcError } = await supabase.rpc("sync_cast_crew", {
      p_project_id: selectedProject.id,
      p_cast_crew_data: castCrewData,
    });

    if (rpcError) {
      console.error("❌ RPC sync_cast_crew failed:", rpcError);
      throw rpcError;
    }

    console.log("✅ Cast/Crew data synced to database successfully (atomic)");
  } catch (error) {
    console.error("❌ Error syncing Cast/Crew data:", error);

    if (error.message && error.message.includes("function")) {
      alert(
        "⚠️ DATABASE ERROR: The sync_cast_crew function is not set up.\n\n" +
          "Please contact your administrator to run the SQL setup script.\n\n" +
          "Your changes were NOT saved."
      );
    }
  }
};

export const syncCharactersToDatabase = async (
  selectedProject,
  updatedCharacters
) => {
  if (!selectedProject || !updatedCharacters) return;

  try {
    console.log("Syncing characters to database...");

    const charactersData = Object.entries(updatedCharacters).map(
      ([name, character]) => ({
        project_id: selectedProject.id,
        name: name,
        scenes: character.scenes || [],
        chronological_number: character.chronologicalNumber || 1,
      })
    );

    await supabase
      .from("characters")
      .delete()
      .eq("project_id", selectedProject.id);

    const { error } = await supabase.from("characters").insert(charactersData);

    if (error) throw error;

    console.log("Characters synced to database successfully");
  } catch (error) {
    console.error("Error syncing characters:", error);
  }
};

export const syncCharacterOverridesToDatabase = async (
  selectedProject,
  updatedOverrides
) => {
  if (!selectedProject || !updatedOverrides) return;

  try {
    console.log("Syncing character overrides to database...");

    const { error } = await supabase
      .from("projects")
      .update({ character_overrides: updatedOverrides })
      .eq("id", selectedProject.id);

    if (error) throw error;

    console.log("Character overrides synced to database successfully");
  } catch (error) {
    console.error("Error syncing character overrides:", error);
  }
};

export const syncCallSheetDataToDatabase = async (
  selectedProject,
  updatedCallSheetData
) => {
  if (!selectedProject || !updatedCallSheetData) return;

  // Empty data protection for object
  if (Object.keys(updatedCallSheetData).length === 0) {
    console.warn("⚠️ SYNC BLOCKED: Empty call sheet data");
    return;
  }

  try {
    console.log("🔄 Syncing Call Sheet data to database (ATOMIC)...");

    const callSheetData = {
      project_id: selectedProject.id,
      call_time: updatedCallSheetData.callTime || "06:00",
      cast_call_times: updatedCallSheetData.castCallTimes || {},
      custom_notes: updatedCallSheetData.customNotes || {},
      crew_by_day: updatedCallSheetData.crewByDay || {},
      table_sizes_by_day: updatedCallSheetData.tableSizesByDay || {},
      call_time_by_day: updatedCallSheetData.callTimeByDay || {},
      notes_by_day: updatedCallSheetData.notesByDay || {},
      crew_call_times: updatedCallSheetData.crewCallTimes || {},
      hidden_cast_by_day: updatedCallSheetData.hiddenCastByDay || {},
    };

    // Use atomic RPC function
    const { error } = await supabase.rpc("sync_call_sheet", {
      p_project_id: selectedProject.id,
      p_call_sheet_data: callSheetData,
    });

    if (error) throw error;

    console.log("✅ Call Sheet data synced successfully (ATOMIC)");
  } catch (error) {
    console.error("❌ Error syncing Call Sheet data:", error);
  }
};

export const syncShootingDaysToDatabase = async (
  selectedProject,
  shootingDays
) => {
  if (!selectedProject || !shootingDays) return;

  // Empty data protection
  if (!Array.isArray(shootingDays) || shootingDays.length === 0) {
    console.warn("⚠️ SYNC BLOCKED: Empty shooting days array");
    return;
  }

  try {
    console.log("🔄 Syncing Shooting Days to database (ATOMIC)...");

    const shootingDaysData = shootingDays.map((day) => ({
      project_id: selectedProject.id,
      day_id: day.id,
      date: day.date,
      day_number: day.dayNumber,
      schedule_blocks: day.scheduleBlocks || [],
      is_locked: day.isLocked || false,
      is_shot: day.isShot || false,
      is_collapsed: day.isCollapsed || false,
    }));

    // Use atomic RPC function
    const { error } = await supabase.rpc("sync_shooting_days", {
      p_project_id: selectedProject.id,
      p_shooting_days_data: shootingDaysData,
    });

    if (error) throw error;

    console.log("✅ Shooting Days synced successfully (ATOMIC)");
  } catch (error) {
    console.error("❌ Error syncing Shooting Days:", error);
  }
};

export const syncTodoItemsToDatabase = async (
  selectedProject,
  updatedTodoItems
) => {
  if (!selectedProject || !updatedTodoItems) return;

  try {
    console.log("Syncing Todo items to database...");

    const todoData = updatedTodoItems.map((item) => ({
      project_id: selectedProject.id,
      item_data: item,
    }));

    await supabase
      .from("todo_items")
      .delete()
      .eq("project_id", selectedProject.id);

    const { error } = await supabase.from("todo_items").insert(todoData);

    if (error) throw error;

    console.log("Todo items synced to database successfully");
  } catch (error) {
    console.error("Error syncing Todo items:", error);
  }
};

export const syncTimelineDataToDatabase = async (
  selectedProject,
  updatedTimelineData
) => {
  if (!selectedProject || !updatedTimelineData) return;

  try {
    console.log("Syncing timeline data to database...");

    const timelineRecord = {
      project_id: selectedProject.id,
      timeline_data: updatedTimelineData,
    };

    await supabase
      .from("timeline_data")
      .delete()
      .eq("project_id", selectedProject.id);

    const { error } = await supabase
      .from("timeline_data")
      .insert([timelineRecord]);

    if (error) throw error;

    console.log("Timeline data synced to database successfully");
  } catch (error) {
    console.error("Error syncing timeline data:", error);
  }
};

export const syncContinuityElementsToDatabase = async (
  selectedProject,
  updatedContinuityElements
) => {
  if (!selectedProject || !updatedContinuityElements) return;

  try {
    console.log("Syncing continuity elements to database...");

    const continuityRecord = {
      project_id: selectedProject.id,
      continuity_elements: updatedContinuityElements,
    };

    await supabase
      .from("continuity_elements")
      .delete()
      .eq("project_id", selectedProject.id);

    const { error } = await supabase
      .from("continuity_elements")
      .insert([continuityRecord]);

    if (error) throw error;

    console.log("Continuity elements synced to database successfully");
  } catch (error) {
    console.error("Error syncing continuity elements:", error);
  }
};

export const syncWardrobeItemsToDatabase = async (
  selectedProject,
  updatedWardrobeItems
) => {
  if (!selectedProject || !updatedWardrobeItems) return;

  try {
    console.log("Syncing wardrobe items to database...");

    const wardrobeData = updatedWardrobeItems.map((item) => ({
      project_id: selectedProject.id,
      item_data: item,
    }));

    await supabase
      .from("wardrobe_items")
      .delete()
      .eq("project_id", selectedProject.id);

    if (wardrobeData.length > 0) {
      const { error } = await supabase
        .from("wardrobe_items")
        .insert(wardrobeData);

      if (error) throw error;
    }

    console.log("Wardrobe items synced to database successfully");
  } catch (error) {
    console.error("Error syncing wardrobe items:", error);
  }
};

export const syncGarmentInventoryToDatabase = async (
  selectedProject,
  updatedGarmentInventory
) => {
  if (!selectedProject || !updatedGarmentInventory) return;

  try {
    console.log("Syncing garment inventory to database...");

    const garmentData = updatedGarmentInventory.map((garment) => ({
      project_id: selectedProject.id,
      garment_data: garment,
    }));

    await supabase
      .from("garment_inventory")
      .delete()
      .eq("project_id", selectedProject.id);

    if (garmentData.length > 0) {
      const { error } = await supabase
        .from("garment_inventory")
        .insert(garmentData);

      if (error) throw error;
    }

    console.log("Garment inventory synced to database successfully");
  } catch (error) {
    console.error("Error syncing garment inventory:", error);
  }
};

export const syncCostCategoriesToDatabase = async (
  selectedProject,
  updatedCostCategories
) => {
  if (!selectedProject || !updatedCostCategories) return;

  try {
    console.log("Syncing cost categories to database...");

    const costData = updatedCostCategories.map((category) => ({
      project_id: selectedProject.id,
      category_id: category.id,
      name: category.name,
      color: category.color,
      expenses: category.expenses || [],
      budget: category.budget || 0,
    }));

    await supabase
      .from("cost_categories")
      .delete()
      .eq("project_id", selectedProject.id);

    if (costData.length > 0) {
      const { error } = await supabase.from("cost_categories").insert(costData);

      if (error) throw error;
    }

    console.log("Cost categories synced to database successfully");
  } catch (error) {
    console.error("Error syncing cost categories:", error);
  }
};

export const syncCostVendorsToDatabase = async (
  selectedProject,
  updatedCostVendors
) => {
  if (!selectedProject || !updatedCostVendors) return;

  try {
    console.log("Syncing cost vendors to database...");

    const vendorData = updatedCostVendors.map((vendorName) => ({
      project_id: selectedProject.id,
      vendor_name: vendorName,
    }));

    await supabase
      .from("cost_vendors")
      .delete()
      .eq("project_id", selectedProject.id);

    if (vendorData.length > 0) {
      const { error } = await supabase.from("cost_vendors").insert(vendorData);

      if (error) throw error;
    }

    console.log("Cost vendors synced to database successfully");
  } catch (error) {
    console.error("Error syncing cost vendors:", error);
  }
};

export const syncTaggedItemsToDatabase = async (
  selectedProject,
  updatedTaggedItems
) => {
  if (!selectedProject || !updatedTaggedItems) return;

  // Convert object to array
  const taggedItemsArray = Object.entries(updatedTaggedItems).map(
    ([word, item]) => ({
      ...item,
      word: word,
    })
  );

  // Empty data protection
  if (taggedItemsArray.length === 0) {
    console.warn("⚠️ SYNC BLOCKED: Empty tagged items");
    return;
  }

  try {
    console.log("🔄 Syncing Tagged Items to database (ATOMIC)...");

    const taggedItemsData = taggedItemsArray.map((item) => ({
      project_id: selectedProject.id,
      word: item.word,
      display_name: item.displayName,
      custom_title: item.customTitle || null,
      category: item.category,
      color: item.color,
      chronological_number: item.chronologicalNumber,
      position: item.position,
      scenes: item.scenes || [],
      instances: item.instances || [],
      assigned_characters: item.assignedCharacters || [],
      manually_created: item.manuallyCreated || false,
      original_prop: item.originalProp || null,
    }));

    // Use atomic RPC function
    const { error } = await supabase.rpc("sync_tagged_items", {
      p_project_id: selectedProject.id,
      p_tagged_items_data: taggedItemsData,
    });

    if (error) throw error;

    console.log("✅ Tagged Items synced successfully (ATOMIC)");
  } catch (error) {
    console.error("❌ Error syncing Tagged Items:", error);
  }
};

export const syncBudgetDataToDatabase = async (
  selectedProject,
  updatedBudgetData
) => {
  if (!selectedProject || !updatedBudgetData) return;

  try {
    console.log("Syncing budget data to database...");

    const budgetRecord = {
      project_id: selectedProject.id,
      project_info: updatedBudgetData.projectInfo || {},
      atl_items: updatedBudgetData.atlItems || [],
      btl_items: updatedBudgetData.btlItems || [],
      legal_items: updatedBudgetData.legalItems || [],
      marketing_items: updatedBudgetData.marketingItems || [],
      post_items: updatedBudgetData.postItems || [],
      contingency_settings: updatedBudgetData.contingencySettings || {},
      department_budgets: updatedBudgetData.departmentBudgets || {},
      weekly_reports: updatedBudgetData.weeklyReports || [],
      custom_categories: updatedBudgetData.customCategories || [],
      totals: updatedBudgetData.totals || {},
    };

    await supabase
      .from("budget_data")
      .delete()
      .eq("project_id", selectedProject.id);

    const { error } = await supabase.from("budget_data").insert([budgetRecord]);

    if (error) throw error;

    console.log("Budget data synced to database successfully");
  } catch (error) {
    console.error("Error syncing budget data:", error);
  }
};

export const syncProjectSettingsToDatabase = async (
  selectedProject,
  updatedProjectSettings
) => {
  if (!selectedProject || !updatedProjectSettings) return;

  try {
    console.log("Syncing project settings to database...");

    // Extract the main fields (filmTitle, producer, director) and put rest in settings
    const { filmTitle, producer, director, ...otherSettings } =
      updatedProjectSettings;

    const { error } = await supabase
      .from("projects")
      .update({
        name: filmTitle || selectedProject.name,
        producer: producer || "",
        director: director || "",
        settings: otherSettings,
      })
      .eq("id", selectedProject.id);

    if (error) throw error;

    console.log("Project settings synced to database successfully");
  } catch (error) {
    console.error("Error syncing project settings:", error);
  }
};

export const syncShotListDataToDatabase = async (
  selectedProject,
  updatedShotListData,
  updatedSceneNotes
) => {
  if (!selectedProject || !updatedShotListData) return;

  try {
    console.log("Syncing shot list data to database...");

    const shotListRecord = {
      project_id: selectedProject.id,
      shot_list_data: updatedShotListData,
      scene_notes: updatedSceneNotes || {},
    };

    await supabase
      .from("shot_list_data")
      .delete()
      .eq("project_id", selectedProject.id);

    const { error } = await supabase
      .from("shot_list_data")
      .insert([shotListRecord]);

    if (error) throw error;

    console.log("Shot list data synced to database successfully");
  } catch (error) {
    console.error("Error syncing shot list data:", error);
  }
};

// ============================================================================
// MAINTENANCE & UTILITY FUNCTIONS
// ============================================================================

export const cleanupDuplicateShootingDays = async (selectedProject) => {
  if (!selectedProject) return;

  try {
    console.log(
      "🔧 AGGRESSIVE CLEANUP: Removing ALL shooting day duplicates..."
    );

    const { count, error: countError } = await supabase
      .from("shooting_days")
      .select("*", { count: "exact", head: true })
      .eq("project_id", selectedProject.id);

    if (countError) throw countError;
    console.log(`Found ${count} shooting day records to delete`);

    const { error } = await supabase
      .from("shooting_days")
      .delete()
      .eq("project_id", selectedProject.id);

    if (error) throw error;

    const { count: afterCount, error: verifyError } = await supabase
      .from("shooting_days")
      .select("*", { count: "exact", head: true })
      .eq("project_id", selectedProject.id);

    if (verifyError) throw verifyError;

    console.log(`✅ Deleted ${count} records. Remaining: ${afterCount}`);
    alert(
      `CLEANUP COMPLETE: Removed ${count} duplicate shooting day records. Database now clean. Remaining records: ${afterCount}`
    );
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    alert("Cleanup failed: " + error.message);
  }
};

export const auditAllDatabaseTables = async (selectedProject) => {
  if (!selectedProject) return;

  try {
    console.log("🔍 AUDITING ALL DATABASE TABLES FOR CORRUPTION...");

    const tables = [
      "scenes",
      "stripboard_scenes",
      "tagged_items",
      "cast_crew",
      "characters",
      "shooting_days",
      "scheduled_scenes",
      "script_locations",
      "actual_locations",
      "call_sheet_data",
      "wardrobe_items",
      "garment_inventory",
      "cost_categories",
      "budget_data",
      "todo_items",
    ];

    const results = {};

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq("project_id", selectedProject.id);

        if (error) {
          results[table] = `ERROR: ${error.message}`;
        } else {
          results[table] = count;
        }
      } catch (err) {
        results[table] = `ERROR: ${err.message}`;
      }
    }

    console.log("🔍 DATABASE AUDIT RESULTS:");
    console.table(results);

    const corruptedTables = Object.entries(results)
      .filter(([table, count]) => typeof count === "number" && count > 1000)
      .map(([table, count]) => `${table}: ${count} records`);

    if (corruptedTables.length > 0) {
      alert(
        `DATABASE CORRUPTION DETECTED!\n\nCorrupted tables:\n${corruptedTables.join(
          "\n"
        )}\n\nCheck console for full audit.`
      );
    } else {
      alert("Database audit complete. Check console for details.");
    }
  } catch (error) {
    console.error("Audit failed:", error);
    alert("Database audit failed: " + error.message);
  }
};

export const emergencyDatabaseCleanup = async (selectedProject) => {
  if (!selectedProject) return;

  const confirmCleanup = window.confirm(
    "EMERGENCY DATABASE CLEANUP\n\n" +
      "This will DELETE ALL project data from the database.\n" +
      "Your local state will be preserved.\n\n" +
      "Are you sure you want to proceed?"
  );

  if (!confirmCleanup) return;

  try {
    console.log("🚨 EMERGENCY CLEANUP: Deleting ALL project data...");

    const tables = [
      "scenes",
      "stripboard_scenes",
      "tagged_items",
      "cast_crew",
      "characters",
      "shooting_days",
      "scheduled_scenes",
      "script_locations",
      "actual_locations",
      "call_sheet_data",
      "wardrobe_items",
      "garment_inventory",
      "cost_categories",
      "budget_data",
      "todo_items",
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("project_id", selectedProject.id);

        if (error) {
          console.error(`Failed to clean ${table}:`, error);
        } else {
          console.log(`✅ Cleaned table: ${table}`);
        }
      } catch (err) {
        console.error(`Error cleaning ${table}:`, err);
      }
    }

    console.log("🎯 EMERGENCY CLEANUP COMPLETE");
    alert(
      "Emergency cleanup complete! All corrupted database records deleted. Your local data is preserved."
    );
  } catch (error) {
    console.error("Emergency cleanup failed:", error);
    alert("Emergency cleanup failed: " + error.message);
  }
};

// ============================================================================
// IMPORT/EXPORT FUNCTIONS
// ============================================================================

export const syncImportedDataToDatabase = async (
  selectedProject,
  projectData
) => {
  if (!selectedProject) {
    console.warn("No project selected for import sync");
    return;
  }

  try {
    console.log("🔄 SYNC STARTED - syncing imported data to database...");

    // 1. Sync scenes
    if (projectData.scenes && projectData.scenes.length > 0) {
      const scenesData = projectData.scenes.map((scene) => ({
        project_id: selectedProject.id,
        scene_number: scene.sceneNumber,
        heading: scene.heading,
        content: scene.content || [],
        metadata: scene.metadata || {},
        page_number: scene.pageNumber,
        page_length: scene.pageLength,
        estimated_duration: scene.estimatedDuration || "30 min",
        status: scene.status || "Not Scheduled",
      }));

      await supabase
        .from("scenes")
        .delete()
        .eq("project_id", selectedProject.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const { error: scenesError } = await supabase
        .from("scenes")
        .insert(scenesData);
      if (scenesError) throw scenesError;
      console.log(`✅ Synced ${scenesData.length} scenes to database`);
    }

    // 2. Sync tagged items
    if (projectData.taggedItems) {
      const taggedItemsData = Object.entries(projectData.taggedItems).map(
        ([word, item]) => ({
          project_id: selectedProject.id,
          word: word,
          display_name: item.displayName,
          custom_title: item.customTitle,
          category: item.category,
          color: item.color,
          chronological_number: item.chronologicalNumber,
          position: item.position,
          scenes: item.scenes || [],
          instances: item.instances || [],
          assigned_characters: item.assignedCharacters || [],
          manually_created: item.manuallyCreated || false,
          original_prop: item.originalProp,
        })
      );

      await supabase
        .from("tagged_items")
        .delete()
        .eq("project_id", selectedProject.id);
      if (taggedItemsData.length > 0) {
        const { error } = await supabase
          .from("tagged_items")
          .insert(taggedItemsData);
        if (error) throw error;
      }
      console.log(`✅ Synced ${taggedItemsData.length} tagged items`);
    }

    // 3. Sync cast & crew
    if (projectData.castCrew && projectData.castCrew.length > 0) {
      const castCrewData = projectData.castCrew
        .filter(
          (person) =>
            person && person.displayName && person.displayName.trim() !== ""
        )
        .map((person) => ({
          project_id: selectedProject.id,
          person_id: person.id,
          user_id: person.user_id || null,
          photo_url: person.photoUrl || null,
          name: person.displayName.trim(),
          role: person.type === "cast" ? person.character : person.position,
          department: person.crewDepartment || "",
          type: person.type || "crew",
          contact_info: {
            email: person.email || "",
            phone: person.phone || "",
            emergencyContact: person.emergencyContact || {},
            wardrobe: person.wardrobe || {},
            dietary: person.dietary || {},
          },
          availability: {
            unavailableDates: person.unavailableDates || [],
            availableDates: person.availableDates || [],
            bookedDates: person.bookedDates || [],
            unionStatus: person.unionStatus || "",
            notes: person.notes || "",
          },
        }));

      // ✅ CRITICAL: Prevent data loss from filtered-out records
      if (castCrewData.length === 0) {
        console.warn(
          "⚠️ IMPORT SYNC BLOCKED: All cast/crew filtered out (empty names). Skipping to prevent data loss."
        );
        // Continue with rest of import, just skip this table
      } else {
        await supabase
          .from("cast_crew")
          .delete()
          .eq("project_id", selectedProject.id);
        const { error } = await supabase.from("cast_crew").insert(castCrewData);
        if (error) throw error;
        console.log(`✅ Synced ${castCrewData.length} cast/crew members`);
      }
    }

    // 4. Sync project settings
    if (projectData.projectSettings) {
      const { error } = await supabase
        .from("projects")
        .update({
          name: projectData.projectSettings.filmTitle || selectedProject.name,
          producer: projectData.projectSettings.producer,
          director: projectData.projectSettings.director,
          settings: {
            ...selectedProject.settings,
            ...projectData.projectSettings,
          },
        })
        .eq("id", selectedProject.id);
      if (error) throw error;
      console.log("✅ Synced project settings");
    }

    // 5. Sync shooting days
    if (projectData.shootingDays && projectData.shootingDays.length > 0) {
      const shootingDaysData = projectData.shootingDays.map((day) => ({
        project_id: selectedProject.id,
        day_id: day.id,
        date: day.date,
        day_number: day.dayNumber,
        schedule_blocks: day.scheduleBlocks || [],
        is_locked: day.isLocked || false,
        is_shot: day.isShot || false,
        is_collapsed: day.isCollapsed || false,
      }));

      await supabase
        .from("shooting_days")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("shooting_days")
        .insert(shootingDaysData);
      if (error) throw error;
      console.log(`✅ Synced ${shootingDaysData.length} shooting days`);
    }

    // 6. Sync characters
    if (
      projectData.characters &&
      Object.keys(projectData.characters).length > 0
    ) {
      const charactersData = Object.entries(projectData.characters).map(
        ([name, character]) => ({
          project_id: selectedProject.id,
          name: name,
          scenes: character.scenes || [],
          chronological_number: character.chronologicalNumber || 1,
        })
      );

      await supabase
        .from("characters")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("characters")
        .insert(charactersData);
      if (error) throw error;
      console.log(`✅ Synced ${charactersData.length} characters`);
    }

    // 7. Sync actual locations
    if (projectData.actualLocations && projectData.actualLocations.length > 0) {
      const locationsData = projectData.actualLocations.map((location) => ({
        project_id: selectedProject.id,
        location_id: location.id,
        name: location.name || "",
        address: location.address || "",
        contact_person: location.contactPerson || "",
        phone: location.phone || "",
        category: location.category || "",
        permit_required: location.permitRequired || false,
        parking_info: location.parkingInfo || "",
        notes: location.notes || "",
        city: location.city || "",
        state: location.state || "",
        zip_code: location.zipCode || "",
      }));

      await supabase
        .from("actual_locations")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("actual_locations")
        .insert(locationsData);
      if (error) throw error;
      console.log(`✅ Synced ${locationsData.length} actual locations`);
    }

    // 8. Sync script locations
    if (projectData.scriptLocations && projectData.scriptLocations.length > 0) {
      const scriptLocationsData = projectData.scriptLocations.map(
        (location) => ({
          project_id: selectedProject.id,
          location_id: location.id,
          parent_location: location.parentLocation || "",
          sub_location: location.subLocation || "",
          full_name: location.fullName || "",
          int_ext: location.intExt || "",
          scenes: location.scenes || [],
          actual_location_id: location.actualLocationId || null,
          category: location.category || "",
        })
      );

      await supabase
        .from("script_locations")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("script_locations")
        .insert(scriptLocationsData);
      if (error) throw error;
      console.log(`✅ Synced ${scriptLocationsData.length} script locations`);
    }

    // 9. Sync call sheet data
    if (projectData.callSheetData) {
      const callSheetRecord = {
        project_id: selectedProject.id,
        call_time: projectData.callSheetData.callTime || "7:30 AM",
        cast_call_times: projectData.callSheetData.castCallTimes || {},
        custom_notes: projectData.callSheetData.customNotes || {},
        crew_by_day: projectData.callSheetData.crewByDay || {},
        table_sizes_by_day: projectData.callSheetData.tableSizesByDay || {},
        call_time_by_day: projectData.callSheetData.callTimeByDay || {},
        notes_by_day: projectData.callSheetData.notesByDay || {},
        crew_call_times: projectData.callSheetData.crewCallTimes || {},
        hidden_cast_by_day: projectData.callSheetData.hiddenCastByDay || {},
      };

      await supabase
        .from("call_sheet_data")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("call_sheet_data")
        .insert([callSheetRecord]);
      if (error) throw error;
      console.log("✅ Synced call sheet data");
    }

    // Continue with remaining tables...
    // (Wardrobe, Garment Inventory, Cost Categories, Budget, Todos, Shot List, Scheduled Scenes, Stripboard Scenes)

    // 10. Sync wardrobe items
    if (projectData.wardrobeItems && projectData.wardrobeItems.length > 0) {
      const wardrobeData = projectData.wardrobeItems.map((item) => ({
        project_id: selectedProject.id,
        item_data: item,
      }));
      await supabase
        .from("wardrobe_items")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("wardrobe_items")
        .insert(wardrobeData);
      if (error) throw error;
      console.log(`✅ Synced ${wardrobeData.length} wardrobe items`);
    }

    // 11. Sync garment inventory
    if (
      projectData.garmentInventory &&
      projectData.garmentInventory.length > 0
    ) {
      const garmentData = projectData.garmentInventory.map((garment) => ({
        project_id: selectedProject.id,
        garment_data: garment,
      }));
      await supabase
        .from("garment_inventory")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("garment_inventory")
        .insert(garmentData);
      if (error) throw error;
      console.log(`✅ Synced ${garmentData.length} garments`);
    }

    // 12. Sync cost categories
    if (projectData.costCategories && projectData.costCategories.length > 0) {
      const costData = projectData.costCategories.map((category) => ({
        project_id: selectedProject.id,
        category_id: category.id,
        name: category.name,
        color: category.color,
        expenses: category.expenses || [],
        budget: category.budget || 0,
      }));
      await supabase
        .from("cost_categories")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase.from("cost_categories").insert(costData);
      if (error) throw error;
      console.log(`✅ Synced ${costData.length} cost categories`);
    }

    // 12b. Sync cost vendors
    if (projectData.costVendors && projectData.costVendors.length > 0) {
      const vendorData = projectData.costVendors.map((vendorName) => ({
        project_id: selectedProject.id,
        vendor_name: vendorName,
      }));
      await supabase
        .from("cost_vendors")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase.from("cost_vendors").insert(vendorData);
      if (error) throw error;
      console.log(`✅ Synced ${vendorData.length} cost vendors`);
    }

    // 13. Sync budget data
    if (projectData.budgetData) {
      const budgetRecord = {
        project_id: selectedProject.id,
        project_info: projectData.budgetData.projectInfo || {},
        atl_items: projectData.budgetData.atlItems || [],
        btl_items: projectData.budgetData.btlItems || [],
        weekly_reports: projectData.budgetData.weeklyReports || [],
        custom_categories: projectData.budgetData.customCategories || [],
        totals: projectData.budgetData.totals || {},
      };
      await supabase
        .from("budget_data")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("budget_data")
        .insert([budgetRecord]);
      if (error) throw error;
      console.log("✅ Synced budget data");
    }

    // 14. Sync todo items
    if (projectData.todoItems && projectData.todoItems.length > 0) {
      const todoData = projectData.todoItems.map((item) => ({
        project_id: selectedProject.id,
        item_data: item,
      }));
      await supabase
        .from("todo_items")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase.from("todo_items").insert(todoData);
      if (error) throw error;
      console.log(`✅ Synced ${todoData.length} todo items`);
    }

    // 15. Sync shot list data
    if (projectData.shotListData) {
      const shotListRecord = {
        project_id: selectedProject.id,
        shot_list_data: projectData.shotListData,
        scene_notes: projectData.sceneNotes || {},
      };
      await supabase
        .from("shot_list_data")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("shot_list_data")
        .insert([shotListRecord]);
      if (error) throw error;
      console.log("✅ Synced shot list data");
    }

    // 16. Sync scheduled scenes
    if (
      projectData.scheduledScenes &&
      Object.keys(projectData.scheduledScenes).length > 0
    ) {
      const scheduledScenesData = Object.entries(
        projectData.scheduledScenes
      ).map(([date, scenes]) => ({
        project_id: selectedProject.id,
        shoot_date: date,
        scenes: scenes || [],
      }));
      await supabase
        .from("scheduled_scenes")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("scheduled_scenes")
        .insert(scheduledScenesData);
      if (error) throw error;
      console.log(
        `✅ Synced ${scheduledScenesData.length} scheduled scene mappings`
      );
    }

    // 17. Sync stripboard scenes
    if (
      projectData.stripboardScenes &&
      projectData.stripboardScenes.length > 0
    ) {
      const stripboardScenesData = projectData.stripboardScenes.map(
        (scene) => ({
          project_id: selectedProject.id,
          scene_number: scene.sceneNumber,
          status: scene.status || "Not Scheduled",
          scheduled_date: scene.scheduledDate || null,
          scheduled_time: scene.scheduledTime || null,
        })
      );
      await supabase
        .from("stripboard_scenes")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("stripboard_scenes")
        .insert(stripboardScenesData);
      if (error) throw error;
      console.log(`✅ Synced ${stripboardScenesData.length} stripboard scenes`);
    }

    // 18. Sync timeline data
    if (
      projectData.timelineData &&
      Object.keys(projectData.timelineData).length > 0
    ) {
      const timelineRecord = {
        project_id: selectedProject.id,
        timeline_data: projectData.timelineData,
      };
      await supabase
        .from("timeline_data")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("timeline_data")
        .insert([timelineRecord]);
      if (error) throw error;
      console.log("✅ Synced timeline data");
    }

    // 19. Sync continuity elements
    if (
      projectData.continuityElements &&
      projectData.continuityElements.length > 0
    ) {
      const continuityRecord = {
        project_id: selectedProject.id,
        continuity_elements: projectData.continuityElements,
      };
      await supabase
        .from("continuity_elements")
        .delete()
        .eq("project_id", selectedProject.id);
      const { error } = await supabase
        .from("continuity_elements")
        .insert([continuityRecord]);
      if (error) throw error;
      console.log("✅ Synced continuity elements");
    }

    console.log("✅ All imported data synced to database successfully");
  } catch (error) {
    console.error("❌ SYNC ERROR:", error);
    alert(
      `Database sync failed: ${error.message}\nCheck console for full details.`
    );
  }
};
