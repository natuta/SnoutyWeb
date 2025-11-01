
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Raza } from '../../shared/models/raza';
import { Especie } from '../../shared/models/especie';

@Component({
  selector: 'app-raza-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './raza-form.html'
})
export default class RazaForm {
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  id: number | null = null;
  model: Raza = { nombre: '', especie: 0 };
  especies: Especie[] = [];
  title = 'Nueva raza';

  ngOnInit(){
    this.api.listEspecies().subscribe(es => this.especies = es);
    const id = this.route.snapshot.paramMap.get('id');
    if(id){
      this.id = +id;
      this.title = 'Editar raza';
      this.api.getRaza(this.id).subscribe(data => this.model = data);
    }
  }
  save(){
    const req = this.id ? this.api.updateRaza(this.id, this.model) : this.api.createRaza(this.model);
    req.subscribe({ next: _ => this.router.navigateByUrl('/razas') });
  }
}
