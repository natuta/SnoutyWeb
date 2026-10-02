import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';

import { AdminReportesService, TopRazaRow, SolicitudesTutorRow, CumplimientoResp } from './admin-reportes.service';

@Component({
  selector: 'app-reportes-admin',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ChartModule,
    TableModule,
    ToastModule,
    ProgressBarModule,
  ],
  templateUrl: './reportes-admin.html',
  providers: [MessageService],
})
export class ReportesAdminPage {
  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef;

  loading = false;

  top = 10;

  topRazas: TopRazaRow[] = [];
  solicitudesTutor: SolicitudesTutorRow[] = [];
  cumplimiento: CumplimientoResp | null = null;

  // ---- KPI (cards)
  kpiTopRazas = 0;
  kpiSolicitudesTotal = 0;
  kpiAprobacionProm = 0; // %
  kpiSeguimiento = '0 / 0'; // al día / total con frecuencia

  // ---- Charts (PrimeNG Chart)
  chartTopRazas: any;
  chartCumplimiento: any;
  chartSolicitudesTutor: any;

  chartOptionsBar: any;
  chartOptionsStacked: any;

  constructor(
    private api: AdminReportesService,
    private msg: MessageService,
  ) {
    this.chartOptionsBar = this.buildBarOptions();
    this.chartOptionsStacked = this.buildStackedOptions();
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;

    forkJoin({
      topRazas: this.api.topRazas(this.top).pipe(catchError(() => of([] as TopRazaRow[]))),
      tutores: this.api.solicitudesPorTutor().pipe(catchError(() => of([] as SolicitudesTutorRow[]))),
      cumplimiento: this.api.cumplimientoSeguimientos().pipe(catchError(() => of(null))),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe((res) => {
        this.topRazas = res.topRazas ?? [];
        this.solicitudesTutor = res.tutores ?? [];
        this.cumplimiento = res.cumplimiento;

        this.computeKpis();
        this.buildCharts();
      });
  }

  // ---------------- KPIs ----------------
  private computeKpis(): void {
    this.kpiTopRazas = this.topRazas.length;

    // total solicitudes (sum)
    this.kpiSolicitudesTotal = this.solicitudesTutor.reduce((acc, r) => acc + (r.total ?? 0), 0);

    // promedio tasa aprobación ponderada
    const aprobadas = this.solicitudesTutor.reduce((acc, r) => acc + (r.aprobadas ?? 0), 0);
    const total = this.solicitudesTutor.reduce((acc, r) => acc + (r.total ?? 0), 0);
    this.kpiAprobacionProm = total ? Math.round((aprobadas / total) * 100) : 0;

    const alDia = this.cumplimiento?.resumen?.al_dia ?? 0;
    const atrasados = this.cumplimiento?.resumen?.atrasados ?? 0;
    // “con frecuencia” = alDia + atrasados (sin_frecuencia no cuenta)
    const conFrecuencia = alDia + atrasados;
    this.kpiSeguimiento = `${alDia} / ${conFrecuencia}`;
  }

  // ---------------- Charts ----------------
  private buildCharts(): void {
    // 1) Top razas bar
    const labelsTop = this.topRazas.map(r => `${r.especie__nombre} - ${r.raza__nombre ?? 'Sin raza'}`);
    const dataTop = this.topRazas.map(r => r.total ?? 0);

    this.chartTopRazas = {
      labels: labelsTop.length ? labelsTop : ['Sin datos'],
      datasets: [
        {
          label: 'Mascotas disponibles',
          data: dataTop.length ? dataTop : [0],
        },
      ],
    };

    // 2) Cumplimiento bar
    const alDia = this.cumplimiento?.resumen?.al_dia ?? 0;
    const atrasados = this.cumplimiento?.resumen?.atrasados ?? 0;
    const sinFrecuencia = this.cumplimiento?.resumen?.sin_frecuencia ?? 0;

    this.chartCumplimiento = {
      labels: ['Al día', 'Atrasados', 'Sin frecuencia'],
      datasets: [
        {
          label: 'Seguimientos',
          data: [alDia, atrasados, sinFrecuencia],
        },
      ],
    };

    // 3) Solicitudes por tutor stacked
    const labelsTutor = this.solicitudesTutor.map(r =>
      `${r.mascota__perfil_tutor__user__nombres} ${r.mascota__perfil_tutor__user__apellidos}`
    );

    this.chartSolicitudesTutor = {
      labels: labelsTutor.length ? labelsTutor : ['Sin datos'],
      datasets: [
        { label: 'Aprobadas', data: labelsTutor.length ? this.solicitudesTutor.map(r => r.aprobadas ?? 0) : [0] },
        { label: 'Rechazadas', data: labelsTutor.length ? this.solicitudesTutor.map(r => r.rechazadas ?? 0) : [0] },
        { label: 'Pendientes', data: labelsTutor.length ? this.solicitudesTutor.map(r => r.pendientes ?? 0) : [0] },
      ],
    };
  }

  private buildBarOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    };
  }

  private buildStackedOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    };
  }

  // ---------------- PDF ----------------
  async exportPdf(): Promise<void> {
    try {
      const element = this.pdfArea?.nativeElement as HTMLElement;
      if (!element) return;

      this.loading = true;

      // ✅ dynamic import (evita errores de types/TS)
      const [{ default: html2canvas }, jsPDFMod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const jsPDF = (jsPDFMod as any).jsPDF;

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // ✅ si types molestan, TS lo acepta porque usamos import dinámico
        useCORS: true,
      } as any);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = position - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('snouty-reportes-admin.pdf');
    } catch (e) {
      console.error(e);
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar a PDF.' });
    } finally {
      this.loading = false;
    }
  }

  // UI helpers
  percentTop(row: TopRazaRow): number {
    const max = Math.max(...this.topRazas.map(r => r.total ?? 0), 0);
    if (!max) return 0;
    return Math.round(((row.total ?? 0) / max) * 100);
  }

  onlyAtrasadosDetalle() {
    const det = this.cumplimiento?.detalle ?? [];
    return det.filter(d => d.estado === 'ATRASADO');
  }
}
