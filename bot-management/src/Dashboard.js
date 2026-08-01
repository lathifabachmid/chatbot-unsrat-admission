import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart } from 'primereact/chart';
import { BASEURL } from "./config"
import bot from './assets/chat-bot.png'
import "primeicons/primeicons.css";
import "../node_modules/primeflex/primeflex.css";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "./assets/style.scss";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

const Dashboard = () => {
  const [chartData, setChartData] = useState({});
  const [fallbackData, setFallbackData] = useState([]);

  useEffect(() => {
    axios.get(`${BASEURL}faq_log.json`).then((res) => {
        const data = res.data;

        // Proses data ke dalam bentuk label dan value
        const labels = data.map(item => `${item.intent} (${item.entity})`);
        const values = data.map(item => item.count);

        setChartData({
        labels,
        datasets: [
            {
            data: values,
            backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#EC407A', '#AB47BC'],
            }
        ]
        });
    });

     axios.get(`${BASEURL}fallback_log.json`).then((res) => {
        setFallbackData(res.data);
    });
  }, []);

  return (
    <div className="h-full flex p-2 w-full">
      <div className="p-card flex flex-column justify-content-center align-items-center">
        <h2 className="text-xl font-bold mb-1">Frequently Ask Question</h2>
        {chartData.labels ? (
          <Chart
            type="pie"
            data={chartData}
            options={{ plugins: { legend: { labels: {usePointStyle: true, boxWidth: 10}, position: 'bottom' } } }}
            style={{ width: '100%' }}
          />
        ) : (
          <p>Memuat data chart...</p>
        )}
      </div>
      <div className="p-card flex flex-column align-items-center ml-2" style={{width: '100%'}}>
        <h2 className="text-xl font-bold mb-1">Fallback Questions History</h2>
        <DataTable value={fallbackData} tableStyle={{ minWidth: '20rem' }} className="mt-4">
            <Column field="id" header="No" body={(data, options) => options.rowIndex + 1} style={{ width: '50px' }} />
            <Column field="question" header="Pertanyaan Fallback" />
            <Column field="fallback_response" header="Jawaban Bot" />
        </DataTable>
      </div>
    </div>
  );
};

export default Dashboard;
