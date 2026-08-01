import React, { useState, useEffect } from "react";
import axios from "axios";
import "primeicons/primeicons.css";
import "../node_modules/primeflex/primeflex.css";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "./assets/style.scss";
import { APIURL } from "./config";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

const Database = (props) => {
  const toast = props.toast;
  const [data, setData] = useState({});
  const [editableData, setEditableData] = useState({});

  useEffect(() => {
    fetchResponseMap();
  }, []);

  const fetchResponseMap = async () => {
    try {
      const res = await axios.get(`${APIURL}`);
      setData(res.data);

      // Deep clone for editing
      const editableCopy = {};
      for (const intent in res.data) {
        editableCopy[intent] = {
          ...res.data[intent],
          data: { ...res.data[intent].data }
        };
      }
      setEditableData(editableCopy);
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.message || "Gagal memuat data",
        life: 7000,
      });
    }
  };

  const handleCellEdit = async (e, intent) => {
    const { rowData, newValue, field, value: oldValue } = e;
    if (newValue === oldValue) return
    const entity = rowData.key;

    try {
        const updatedValue = newValue.split('|').map((str) => str.trim());

        // Update backend
        await axios.put(`${APIURL}/${intent}/data/${entity}`, updatedValue);

        // Optional: Show toast before re-fetch
        toast.current.show({
        severity: "success",
        summary: "Tersimpan",
        detail: `Entity "${entity}" pada intent "${intent}" berhasil disimpan.`,
        life: 3000,
        });

        // Re-fetch updated data from backend
        fetchResponseMap();  // 🔁 Refresh entire data from API
    } catch (error) {
        toast.current.show({
        severity: "error",
        summary: "Gagal",
        detail: error.message || "Gagal menyimpan perubahan.",
        life: 7000,
        });
    }
  };


  return (
    <div className="p-4 w-full">
      {Object.keys(editableData).map((intent) => {
        const entityData = editableData[intent].data || {};
        const entityKeys = Object.keys(entityData);

        if (entityKeys.length === 0) return null; // skip if data is {}

        const tableRows = entityKeys.map((key) => ({
          key,
          value: entityData[key],
        }));

        return (
          <div key={intent} className="mb-5 border rounded p-3 shadow-sm bg-white">
            <h3 className="text-xl font-semibold mb-2">{intent}</h3>
            <DataTable
                value={tableRows}
                editMode="cell"
                onCellEditComplete={(e) => handleCellEdit(e, intent)}
                className="p-datatable-sm"
                >
                <Column field="key" header="Data" style={{ width: '30%' }} />
                <Column
                    field="value"
                    header="Responses"
                    editor={(options) => (
                    <InputText
                        type="text"
                        value={options.value}
                        onChange={(e) => options.editorCallback(e.target.value)}
                        className="w-full"
                    />
                    )}
                    onCellEditComplete={(e) => handleCellEdit(e, intent)} 
                    style={{ width: '70%' }}
                />
            </DataTable>

          </div>
        );
      })}
    </div>
  );
};

export default Database;