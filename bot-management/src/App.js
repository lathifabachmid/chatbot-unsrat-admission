import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { ConfirmPopup } from "primereact/confirmpopup";
import { confirmPopup } from "primereact/confirmpopup";
import { APIURL } from "./config"
import bot from './assets/chat-bot.png'
import "primeicons/primeicons.css";
import "../node_modules/primeflex/primeflex.css";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "./assets/style.scss";
import Dashboard from "./Dashboard";
import Database from "./Database";

const App = () => {
  const op = useRef(null);
  const toast = useRef(null);
  const [data, setData] = useState([]);
  const [currentIntent, setCurrentIntent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newIntent, setNewIntent] = useState("");
  const [dashboard, setDashboard] = useState(false)
  const [database, setDatabase] = useState(false)

  useEffect(() => {
    fetchResponseMap();
  }, []);

  useEffect(() => {
    const prevIntent = currentIntent?.intent
    if (prevIntent) {
      setCurrentIntent({
        ...data[prevIntent],
        intent: prevIntent,
      })
    }
  }, [data])

  const fetchResponseMap = async () => {
    try {
      await axios.get(`${APIURL}`).then((res) => {
        setData(res.data);
        if (currentIntent) {
          setCurrentIntent({
            ...data[currentIntent.intent],
            intent: currentIntent.intent,
          });
        }
      });
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error,
        life: 7000,
      });
    }
  };

  const handleClick = (e) => {
    const selectedIntent = data[e.target.id];
    if (selectedIntent) {
      setEditing(false)
      setCurrentIntent({
        ...data[e.target.id],
        intent: e.target.id,
      });
    }
  };

  const onCellEditComplete = (e, section) => {
    let { rowData, newValue, field, originalEvent: event } = e;

    if (!newValue.trim()) {
      event.preventDefault(); // Prevent empty values
      return;
    }

    setCurrentIntent((prev) => {
      let updatedSection = { ...prev[section] };

      if (field === "key") {
        delete updatedSection[rowData.key];
        updatedSection[newValue] = rowData.value;
      } else if (field === "value") {
        updatedSection[rowData.key] = newValue;
      }

      return {
        ...prev,
        [section]: updatedSection,
      };
    });
  };

  const onEntityEditComplete = (e, section) => {
  let { rowData, newValue, field, originalEvent: event } = e;

  if (!newValue.trim()) {
    event.preventDefault();
    return;
  }

  setCurrentIntent((prev) => {
    const updated = { ...prev };

    if (section === "entities") {
      const { key, index } = rowData;
      const values = Array.isArray(prev.entities[key])
        ? [...prev.entities[key]]
        : [prev.entities[key]];

      if (field === "key") {
        // If key is being edited
        delete updated.entities[key];
        updated.entities[newValue] = values;
      } else if (field === "value") {
        values[index] = newValue;
        updated.entities[key] = values;
      }
    } else {
      // Default handling for 'data' section
      const sectionObj = { ...prev[section] };

      if (field === "key") {
        delete sectionObj[rowData.key];
        sectionObj[newValue] = rowData.value;
      } else if (field === "value") {
        sectionObj[rowData.key] = newValue;
      }

      updated[section] = sectionObj;
    }

    return updated;
  });
};


  const textEditor = (options) => {
    return (
      <InputTextarea
        autoResize
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
        className="w-full"
      />
    );
  };

  const handleSave = async () => {
    try {
      await axios
        .put(
          `${APIURL}/${currentIntent.intent}`,
          currentIntent
        )
        .then((res) => {
          if (res.data.result) {
            setEditing(false);
            toast.current.show({
              severity: "success",
              summary: "Sukses",
              detail: "Data Berhasil Disimpan!",
              life: 3000,
            });
            fetchResponseMap();
          } else {
            toast.current.show({
              severity: "error",
              summary: "Error",
              detail: res.data.msg,
              life: 5000,
            });
          }
        });
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error,
        life: 7000,
      });
    }
  };
  const confirmSave = (e) => {
    confirmPopup({
      target: e.currentTarget,
      message: `Apakah Anda Yakin Ingin Menyimpan Data Ke Server?`,
      icon: 'pi pi-exclamation-triangle',
      defaultFocus: 'accept',
      accept: () => handleSave(),
    });
  }

  const deleteRowFromServer = async (section, key) => {
    console.log(section, key)
    try {
      await axios
        .delete(
          `${APIURL}/${currentIntent.intent}/${section}/${key}`,
          {
          headers: {
            'Content-Type': 'application/json',
          },
          data: {}
          }
        )
        .then((res) => {
          if (res.data.result) {
            fetchResponseMap();
            toast.current.show({
              severity: "success",
              summary: "Sukses!",
              detail: "Hapus Data Berhasil!",
              life: 3000,
            });
          } else {
            toast.current.show({
              severity: "error",
              summary: "Error",
              detail: res.data.msg,
              life: 5000,
            });
          }
        });
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error,
        life: 7000,
      });
    }
  };

  const deleteValueFromServer = async (section, key, value) => {
    try {
      await axios.delete(
        `${APIURL}/${currentIntent.intent}/${section}/${key}`,
        { data: { value } } // Pass value in request body
      ).then((res) => {
        if (res.data.result) {
          fetchResponseMap();
          toast.current.show({
            severity: "success",
            summary: "Sukses!",
            detail: "Hapus Data Berhasil!",
            life: 3000,
          });
        } else {
          toast.current.show({
            severity: "error",
            summary: "Error",
            detail: res.data.msg,
            life: 5000,
          });
        }
      });
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.toString(),
        life: 7000,
      });
    }
  };

  const confirmDelete = (e, section, key, value) => {
    confirmPopup({
      target: e.currentTarget,
      message: `Apakah Anda Yakin Ingin Menghapus ${key}?`,
      icon: 'pi pi-exclamation-triangle',
      defaultFocus: 'accept',
      accept: () => { section==="entities"? deleteValueFromServer(section, key, value) : deleteRowFromServer(section, key) },
    });
  }

  

  const addIntent = async () => {
    if (newIntent === '') {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: 'Nama Intent Tidak Boleh Kosong!',
        life: 5000,
      });
    } else {
      try {
        await axios
          .post(`${APIURL}`, { [newIntent]: {} })
          .then((res) => {
            console.log(res)
            if (res.data.result) {
              fetchResponseMap();
              setNewIntent("");
              op.current.toggle(false);
              toast.current.show({
                severity: "success",
                summary: "Success",
                detail: "Tambah Intent Berhasil!",
                life: 3000,
              });
            } else {
              toast.current.show({
                severity: "error",
                summary: "Error",
                detail: res.data.msg,
                life: 5000,
              });
            }
          });
      } catch (error) {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: error,
          life: 7000,
        });
      }
    }
  };
  const deleteIntent = async () => {
    try {
      await axios
        .delete(
          `${APIURL}/${currentIntent.intent}`
        )
        .then((res) => {
          if (res.data.result) {
            fetchResponseMap();
            toast.current.show({
              severity: "success",
              summary: "Sukses!",
              detail: "Hapus Intent Berhasil!",
              life: 3000,
            });
            setCurrentIntent(null)
          } else {
            toast.current.show({
              severity: "error",
              summary: "Error",
              detail: res.data.msg,
              life: 5000,
            });
          }
        });
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error,
        life: 7000,
      });
    }
  };
  const confirmDeleteIntent = (e) => {
    confirmPopup({
      target: e.currentTarget,
      message: `Apakah Anda Yakin Ingin Menghapus ${currentIntent.intent}?`,
      icon: 'pi pi-exclamation-triangle',
      defaultFocus: 'accept',
      accept: () => deleteIntent(),
    });
  }

  return (
    <div className="bot-management min-w-screen min-h-screen flex justify-content-center align-items-center bg-blue-50">
      <Toast ref={toast} />
      <ConfirmPopup />
      <img src={bot} className="w-10rem absolute bottom-0 right-0 mr-3 mb-3 opacity-30" />
      <div
        className="flex bg-gray-200 border-round shadow-3 w-11 relative"
        style={{ marginTop: '4rem' }}
      >
        <div className="absolute text-lg bottom-100 mb-2 font-bold text-blue-700 flex justify-content-center align-items-center">
          <img src={bot} className="w-2rem mr-2" />
          <span>BOT RESPONSE MANAGEMENT</span>
          <Button label="Bot Manajemen" onClick={() => { setDashboard(false); setDatabase(false) }} className="ml-4" />
          <Button label="Statistik Bot" onClick={() => { setDashboard(true); setDatabase(false) }} className="ml-4" />
          <Button label="Database" onClick={() => { setDatabase(true); setDashboard(false) }} className="ml-4" />
        </div>

        {(!dashboard && !database) && <>
          {/* Sidebar with Intent Names */}
          <div
            className="h-full flex flex-column bg-blue-300 w-max"
          >
            <div className="w-full px-3 flex align-items-center h-3rem">
              <span className="font-bold text-xl mr-2">Intent</span>
              <Button
                icon="pi pi-plus"
                className="p-1 ml-2 w-2rem h-2rem"
                onClick={(e) => op.current.toggle(e)}
              />
              <OverlayPanel ref={op}>
                <InputText
                  value={newIntent}
                  onChange={(e) => setNewIntent(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIntent()}
                />
                <Button className="ml-2" label="Tambah" onClick={() => addIntent()} />
              </OverlayPanel>
            </div>
            {Object.keys(data).map((key) => (
              <div
                key={key}
                id={key}
                onClick={(e) => handleClick(e)}
                className={`font-semibold py-2 px-5 text-base border-bottom-1 border-gray-100 w-full cursor-pointer hover:bg-blue-400 ${currentIntent?.intent === key && 'bg-gray-200'}`}
              >
                {/* {key.replace(/_/g, " ")} */}
                {key}
              </div>
            ))}
          </div>

          {/* DataTable Section */}
          <div className="h-full w-full flex flex-column border-left-1 border-gray-200">
            <div className="font-bold text-lg flex justify-content-between align-items-center p-3 bg-blue-300 w-full relative h-3rem">
              {currentIntent?.intent || "Tidak Ada Intent Yang Dipilih"}
              {currentIntent && (
                <div>
                  <Button icon="pi pi-trash" label="Hapus Intent" className="h-2rem mr-3" onClick={(e) => confirmDeleteIntent(e)} />
                  <Button
                    label={editing ? "Simpan" : "Ubah"}
                    className="py-2 px-3 mr-2 h-2rem"
                    onClick={
                      editing
                        ? (e) => confirmSave(e)
                        : () => setEditing(true)
                    }
                  />
                  {editing && (
                    <Button
                      label="Batal"
                      className="py-2 px-3 h-2rem"
                      onClick={() => {
                        setEditing(false);
                        fetchResponseMap();
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {currentIntent ? (
              <div className="w-full p-3 current-intent-wrapper overflow-y-scroll" style={{ maxHeight: '47rem' }}>
                {/* Default Section */}
                <div className="mb-3">
                  <h3 className="font-bold">Default</h3>
                  {(currentIntent.default || []).map((response, index) => (
                    <InputTextarea
                      key={index}
                      rows={2}
                      value={response}
                      onChange={(e) => {
                        const updated = [...currentIntent.default];
                        updated[index] = e.target.value;
                        setCurrentIntent({ ...currentIntent, default: updated });
                      }}
                      className="w-full mb-2"
                      disabled={!editing}
                    />
                  ))}
                  {editing && (
                    <Button
                      icon="pi pi-plus"
                      label="Tambah Default"
                      className="mt-1"
                      onClick={() =>
                        setCurrentIntent({
                          ...currentIntent,
                          default: [...(currentIntent.default || []), ""],
                        })
                      }
                    />
                  )}
                </div>

                {/* Entities Section */}
                <h3 className="font-bold">Entities</h3>
                <DataTable
                  editMode={editing ? "cell" : null}
                  value={(currentIntent.entities
                    ? Object.entries(currentIntent.entities).flatMap(([key, values]) =>
                        (Array.isArray(values) ? values : [values]).map((value, index) => ({
                          key,
                          value,
                          index
                        }))
                      )
                    : [])
                  }
                  className="mb-3"
                >
                  <Column
                    field="key"
                    header="Key"
                    editor={(options) => textEditor(options)}
                    onCellEditComplete={(e) => onEntityEditComplete(e, "entities")}
                  />
                  <Column
                    field="value"
                    header="Value"
                    editor={(options) => textEditor(options)}
                    onCellEditComplete={(e) => onEntityEditComplete(e, "entities")}
                  />
                  {editing && (
                    <Column
                      body={(rowData) => (
                        <Button
                          icon="pi pi-trash"
                          className="p-button-danger p-button-rounded p-button-sm p-0 w-2rem h-2rem"
                          onClick={(e) => confirmDelete(e, "entities", rowData.key, rowData.value)}
                        />
                      )}
                      header="Actions"
                    />
                  )}
                </DataTable>
                {editing && (
                  <Button
                    label="Add Row"
                    icon="pi pi-plus"
                    className="py-2 px-3 mb-3"
                    onClick={() => {
                            const key = prompt("Masukkan key entity (gunakan yang sudah ada untuk menambah respons)");
                            if (key) {
                              setCurrentIntent((prev) => {
                                const updated = { ...prev };
                                const existing = updated.entities?.[key];
                                if (existing) {
                                  updated.entities[key] = Array.isArray(existing) ? [...existing, ""] : [existing, ""];
                                } else {
                                  updated.entities = {
                                    ...updated.entities,
                                    [key]: [""],
                                  };
                                }
                                return updated;
                              });
                            }
                          }}
                  />
                )}

                {/* Data Section */}
                <h3 className="font-bold">Data</h3>
                <DataTable
                  editMode={editing ? "cell" : null}
                  value={Object.entries(currentIntent.data || {}).map(
                    ([key, value]) => ({ key, value })
                  )}
                  className="mb-3"
                >
                  <Column
                    field="key"
                    header="Key"
                    editor={(options) => textEditor(options)}
                    onCellEditComplete={(e) => onCellEditComplete(e, "data")}
                  />
                  <Column
                    field="value"
                    header="Value"
                    editor={(options) => textEditor(options)}
                    onCellEditComplete={(e) => onCellEditComplete(e, "data")}
                  />
                  {editing && (
                    <Column
                      body={(rowData) => (
                        <Button
                          icon="pi pi-trash"
                          className="p-button-danger p-button-rounded p-button-sm p-0 w-2rem h-2rem"
                          onClick={(e) => confirmDelete(e, "data", rowData.key)}
                        />
                      )}
                      header="Actions"
                    />
                  )}
                </DataTable>
                {editing && (
                  <Button
                    label="Add Row"
                    icon="pi pi-plus"
                    className="py-2 px-3 mb-3"
                    onClick={() => {
                      setCurrentIntent((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          [`new key-${Date.now()}`]: "", // Generates a unique key for new row
                        },
                      }));
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="font-bold text-center text-gray-600 pt-4">
                Silahkan Pilih Intent Atau Tambah Intent Untuk Di Edit
              </div>
            )}
          </div>
        </>}

        {dashboard && <Dashboard />}
        {database && <Database toast={toast} />}
      </div>
    </div>
  );
};

export default App;