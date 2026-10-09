"""A wall lantern, the balcony's, from the owner's picture: a black cast body, the half of a six-sided lantern that stands against the wall, a flat back and three faces in front (the middle one and an
angled one each side), frosted glass in each face in two panes, one over the other, a slightly tapered body narrower toward the bottom and a black cap: a flat rim, then a sloping roof that
rises to a small top. Units in metres; 0.20 m wide, 0.28 m tall and 0.15 m deep (assumed from the picture).

Axes in Blender: X is the width, Y the depth (the front, away from the wall, is -Y, which the exporter turns into +Z; the flat back is against the wall) and Z the height; it stands at Z = 0, centred. The
`lit` parameter chooses the glass: a warm light that glows (true), or the dull frosted glass of a lamp that is off (false).
"""
from __future__ import annotations

import hashlib
from pathlib import Path


def paint(bpy, name, color, roughness, metallic=0, emission=None):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    srgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    item.diffuse_color = (*linear, 1)
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission, 1)
        shader.inputs['Emission Strength'].default_value = 4
    return item


def build(request, _default_material):
    import bpy
    import bmesh
    from mathutils import Vector

    width, height, depth = request['dimensions']
    lit = bool(request['parameters'].get('lit', True))
    black = paint(bpy, 'Cast black', '#1b1c1e', .5, .35)
    glass = paint(bpy, 'Frosted glass', '#ffe9c4', .35, 0, emission=(1, .78, .45)) if lit else paint(bpy, 'Frosted glass off', '#cfc8b8', .6)
    parts = []

    # The outline seen from above: the flat back against the wall (+Y) and the three faces in front.
    half, back, front = width * .42, depth / 2, -depth / 2
    outline = [(-half, back), (half, back), (width / 2, back - depth * .3), (half * .5, front), (-half * .5, front), (-width / 2, back - depth * .3)]
    body_height = height * .78
    taper = .86

    def ring(scale, z, flat=False):
        points = []
        for x, y in outline:
            # The body narrows toward the bottom about the back's middle: the back stays against the wall.
            points.append((x * scale, back - (back - y) * scale, z))
        return points

    def link(name, mesh, finish):
        data = bpy.data.meshes.new(name)
        mesh.to_mesh(data)
        mesh.free()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        data.materials.append(finish)
        parts.append(obj)

    bottom, top = ring(taper, 0), ring(1, body_height)
    frame = bmesh.new()
    glass_mesh = bmesh.new()

    def lerp(a, b, t):
        return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

    # The five faces in front of the back: the frame is the whole quad, the glass two inset panes on it (the muntin between them), a hair proud.
    for index in range(1, 6):
        a, b = index, (index + 1) % 6
        if index == 5:
            a, b = 5, 0
        quad = [bottom[a], bottom[b], top[b], top[a]]
        frame.faces.new([frame.verts.new(point) for point in quad])
        panes = [(.14, .86, .08, .47), (.14, .86, .53, .92)]
        for s0, s1, t0, t1 in panes:
            def point(s, t):
                low, high = lerp(bottom[a], bottom[b], s), lerp(top[a], top[b], s)
                p = lerp(low, high, t)
                # A hair out of the face, along its outward normal.
                edge = Vector((bottom[b][0] - bottom[a][0], bottom[b][1] - bottom[a][1], 0))
                normal = Vector((-edge.y, edge.x, 0)).normalized()
                return (p[0] + normal.x * .0012, p[1] + normal.y * .0012, p[2])
            glass_mesh.faces.new([glass_mesh.verts.new(p) for p in (point(s0, t0), point(s1, t0), point(s1, t1), point(s0, t1))])
    # The flat back and the bottom plate close the body.
    frame.faces.new([frame.verts.new(point) for point in (bottom[0], top[0], top[1], bottom[1])])
    frame.faces.new([frame.verts.new(point) for point in bottom])
    # The cap: a flat rim a little wider than the body, then a sloping roof rising to a small top.
    rim0, rim1, roof, crown = ring(1.1, body_height), ring(1.1, body_height + .012), ring(.55, body_height + height * .13), ring(.4, body_height + height * .19)
    for lower, upper in ((rim0, rim1), (rim1, roof), (roof, crown)):
        for index in range(6):
            frame.faces.new([frame.verts.new(point) for point in (lower[index], lower[(index + 1) % 6], upper[(index + 1) % 6], upper[index])])
    frame.faces.new([frame.verts.new(point) for point in reversed(crown)])
    frame.faces.new([frame.verts.new(point) for point in reversed(rim0)])
    for mesh in (frame, glass_mesh):
        bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces[:])
    link('Lantern body', frame, black)
    link('Frosted glass', glass_mesh, glass)

    for obj in parts:
        for polygon in obj.data.polygons:
            polygon.use_smooth = False
    points = [vertex.co for obj in parts for vertex in obj.data.vertices]
    lower = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    upper = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    size = upper - lower
    target = Vector((request['dimensions'][0], request['dimensions'][2], request['dimensions'][1]))
    centre = Vector(((lower.x + upper.x) / 2, (lower.y + upper.y) / 2, lower.z))
    for obj in parts:
        for vertex in obj.data.vertices:
            vertex.co = Vector(tuple((vertex.co[i] - centre[i]) * target[i] / size[i] for i in range(3)))
        obj.data.update()
    return parts, {
        'recipe': 'lantern', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
